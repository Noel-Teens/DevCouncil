"""
Adversarial verification pass.

The specialist agents can be confidently wrong — especially on languages where no
static-analysis scanner grounds them (everything except Python today). This pass
re-reads every proposed finding against the ACTUAL cited source and drops or
downgrades the ones that don't hold up: unsupported claims, values the attacker
can't control, public identifiers mislabeled as secrets, out-of-domain findings,
and severity that isn't justified by a concrete consequence.

It is one extra LLM call per analysis, language-agnostic, and fail-open: if the
call errors or times out, the original findings pass through unchanged.
"""

import asyncio
import json
import logging
from pathlib import PurePosixPath

from app.agents.base import BaseAgent
from app.models.schemas import AgentOutput, AnalysisContext, Finding, Severity

logger = logging.getLogger(__name__)

_VERIFIER_SYSTEM_PROMPT = """You are a skeptical Staff Engineer doing QA on an automated multi-agent code review. Your job is to catch findings that are wrong, exaggerated, or misattributed BEFORE they reach the user. You are language- and framework-agnostic.

You will receive a list of proposed findings (each with an id, the agent that raised it, severity, category, a file:line citation, and a description) plus snippets of the cited source code.

For EACH finding return a verdict:
  - "keep": the finding is supported by the cited code and the severity is justified.
  - "downgrade": the issue is real but the severity is too high for the actual consequence — provide a lower severity.
  - "drop": the finding should be removed.

DROP a finding when ANY of these hold:
  1. UNSUPPORTED: the cited code does not actually show the claimed problem.
  2. NOT ATTACKER-CONTROLLABLE: the "vulnerability" targets a value the attacker cannot influence (a build-time constant, the app's own config/base URL, IaC account/region). No real injection/SSRF/tampering is possible.
  3. PUBLIC IDENTIFIER AS SECRET: it flags a non-secret (account/client/tenant/project id, region, bucket/resource name, or any value shipped to the browser such as PUBLIC_/NEXT_PUBLIC_/VITE_/REACT_APP_) as a leaked credential.
  4. NORMAL CONFIG: it flags an env-var read with a fallback (e.g. `getenv(X,"")`, `process.env.X || ""`) as "hardcoded".
  5. OUT OF DOMAIN: a Security finding that is really dead code / style / missing error handling; or an Architect finding that is really error handling / input validation / style.
  6. DUPLICATE: it restates another finding in the same file about the same root cause.

DOWNGRADE (don't drop) when the issue is genuine but the severity is inflated:
  - CRITICAL is ONLY for a concrete, remotely exploitable issue (leaked private key/token/password, injection, unauthenticated RCE/admin). If the exploit can't be stated in one sentence, it is at most HIGH.
  - Do not be shy about downgrading LOW-value issues to LOW/INFO.

Be strict but fair: keep findings that are genuinely correct and well-scoped — do not drop real bugs.

Return ONLY valid JSON:
{
  "decisions": [
    {"id": "<finding id>", "verdict": "keep|downgrade|drop", "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO", "reason": "<one sentence>"}
  ]
}
No preamble, no text outside the JSON."""


class VerifierAgent(BaseAgent):
    @property
    def agent_name(self) -> str:
        return "verifier"

    def get_system_prompt(self) -> str:
        return _VERIFIER_SYSTEM_PROMPT

    def build_user_prompt(self, context: AnalysisContext) -> str:  # unused
        return ""


def _snippet_for(content: str, line_number: int | None, radius: int = 18) -> str:
    """Return a code snippet centered on line_number (1-indexed), or the head."""
    if not content:
        return ""
    lines = content.splitlines()
    if line_number and 1 <= line_number <= len(lines):
        start = max(0, line_number - radius)
        end = min(len(lines), line_number + radius)
        numbered = [f"{i + 1}: {lines[i]}" for i in range(start, end)]
        return "\n".join(numbered)
    return "\n".join(f"{i + 1}: {ln}" for i, ln in enumerate(lines[:40]))


def _build_verifier_prompt(findings: list[Finding], context: AnalysisContext) -> str:
    # Index file contents by normalized path for quick lookup.
    by_path = {fc.path.replace("\\", "/"): fc.content for fc in context.file_contents}

    findings_lines = []
    for f in findings:
        loc = f.file_path + (f":{f.line_number}" if f.line_number else "")
        findings_lines.append(
            f'- id={f.id} agent={f.id.rsplit("_", 1)[0]} severity={f.severity} '
            f'category="{f.category}" at {loc}\n  claim: {f.description}'
        )

    # Attach a snippet for each unique referenced file (bounded for TPM budget).
    snippets = []
    seen: set[str] = set()
    for f in findings:
        fp = (f.file_path or "").replace("\\", "/")
        if not fp or fp in seen:
            continue
        seen.add(fp)
        # Match by exact path or basename suffix.
        content = by_path.get(fp)
        if content is None:
            base = PurePosixPath(fp).name
            for p, c in by_path.items():
                if p.endswith(fp) or PurePosixPath(p).name == base:
                    content = c
                    break
        if content:
            snippets.append(
                f"--- {fp} ---\n{_snippet_for(content, f.line_number)[:1000]}"
            )
        if len(snippets) >= 8:
            break

    return (
        "PROPOSED FINDINGS:\n" + "\n".join(findings_lines)
        + "\n\nCITED SOURCE SNIPPETS (line-numbered):\n"
        + ("\n\n".join(snippets) if snippets else "(no source available)")
        + "\n\nReturn the decisions JSON."
    )


async def verify_agent_outputs(
    agent_outputs: list[AgentOutput], context: AnalysisContext
) -> tuple[list[AgentOutput], dict]:
    """Re-check all findings against source. Returns (outputs, stats).

    Mutates each output's ``findings`` to the surviving, severity-corrected set.
    Fail-open: on any error the outputs are returned unchanged.
    """
    all_findings = [f for o in agent_outputs for f in o.findings]
    stats = {"checked": len(all_findings), "dropped": 0, "downgraded": 0}
    if not all_findings:
        return agent_outputs, stats

    verifier = VerifierAgent()
    user_prompt = _build_verifier_prompt(all_findings, context)
    try:
        raw = await asyncio.wait_for(
            verifier.call_llm(_VERIFIER_SYSTEM_PROMPT, user_prompt), timeout=25
        )
        decisions = {d.get("id"): d for d in json.loads(raw).get("decisions", [])}
    except Exception as e:
        logger.warning(f"[verifier] Verification pass failed, keeping findings as-is: {e}")
        return agent_outputs, stats

    valid_sev = {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"}
    for output in agent_outputs:
        surviving: list[Finding] = []
        for f in output.findings:
            d = decisions.get(f.id)
            if d is None:
                surviving.append(f)  # fail-open for unmentioned findings
                continue
            verdict = (d.get("verdict") or "keep").lower()
            if verdict == "drop":
                stats["dropped"] += 1
                logger.info(f"[verifier] dropped {f.id}: {d.get('reason', '')}")
                continue
            if verdict == "downgrade":
                new_sev = (d.get("severity") or "").upper()
                if new_sev in valid_sev and new_sev != _sev(f):
                    f.severity = Severity(new_sev)
                    # An unverified finding shouldn't hold veto power once downgraded.
                    if new_sev != "CRITICAL":
                        f.veto_active = False
                    stats["downgraded"] += 1
            surviving.append(f)
        output.findings = surviving

    return agent_outputs, stats


def _sev(f: Finding) -> str:
    return f.severity.value if hasattr(f.severity, "value") else str(f.severity)
