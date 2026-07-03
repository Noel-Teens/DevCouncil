"""
Base agent class with Groq LLM integration, JSON parsing, retry logic, and timeout handling.
"""

import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod

from groq import AsyncGroq

from app.config import get_settings
from app.models.schemas import AgentOutput, AnalysisContext, Finding

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Base class for all DevCouncil AI agents."""

    def __init__(self):
        self.settings = get_settings()
        self.client = AsyncGroq(api_key=self.settings.groq_api_key)
        self.model = "llama-3.3-70b-versatile"
        self.max_retries = 2
        self.temperature = 0.3

    @property
    @abstractmethod
    def agent_name(self) -> str:
        """Unique agent identifier."""
        ...

    @abstractmethod
    def get_system_prompt(self) -> str:
        """Return the agent's system prompt."""
        ...

    @abstractmethod
    def build_user_prompt(self, context: AnalysisContext) -> str:
        """Build the user prompt from analysis context."""
        ...

    def _build_file_tree_text(self, context: AnalysisContext, max_entries: int = 50) -> str:
        """Format the file tree as readable text."""
        lines = []
        for entry in context.file_tree[:max_entries]:
            lang_tag = f" [{entry.language}]" if entry.language else ""
            lines.append(f"  {entry.path} ({entry.size}B){lang_tag}")
        if len(context.file_tree) > max_entries:
            lines.append(f"  ... and {len(context.file_tree) - max_entries} more files")
        return "\n".join(lines)

    def _build_file_contents_text(self, context: AnalysisContext, max_files: int = 8) -> str:
        """Format file contents for the prompt.
        Reduced from 15 files/4000 chars to fit Groq free tier (12k TPM).
        """
        sections = []
        for fc in context.file_contents[:max_files]:
            # Truncate content to manage token count
            content = fc.content[:2000]
            sections.append(
                f"--- FILE: {fc.path} [{fc.language or 'unknown'}] ---\n{content}\n--- END FILE ---"
            )
        return "\n\n".join(sections)

    def _build_ast_text(self, context: AnalysisContext) -> str:
        """Format AST summary."""
        parts = []
        if context.ast_summary.functions:
            parts.append(f"Functions: {', '.join(context.ast_summary.functions[:30])}")
        if context.ast_summary.classes:
            parts.append(f"Classes: {', '.join(context.ast_summary.classes[:20])}")
        if context.ast_summary.imports:
            parts.append(f"Imports: {', '.join(context.ast_summary.imports[:20])}")
        if context.ast_summary.routes:
            parts.append(f"Routes: {', '.join(context.ast_summary.routes[:15])}")
        return "\n".join(parts) if parts else "No AST data available."

    def _build_other_agent_summaries_text(self, context: AnalysisContext) -> str:
        """Format other agents' summaries for discussion phase."""
        if not context.other_agent_summaries:
            return ""
        sections = []
        for summary in context.other_agent_summaries:
            sections.append(
                f"--- {summary.agent_name.upper()} AGENT SUMMARY ---\n"
                f"Summary: {summary.summary}\n"
                f"Top Priority: {summary.top_priority}\n"
                f"Findings Count: {summary.finding_count}\n"
                f"--- END ---"
            )
        return "\n\n".join(sections)

    async def call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """Make a Groq API call with the given prompts."""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=self.temperature,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"[{self.agent_name}] LLM call failed: {e}")
            raise

    def parse_output(self, raw_output: str) -> AgentOutput:
        """Parse and validate LLM JSON output into AgentOutput."""
        try:
            data = json.loads(raw_output)

            # Normalize findings
            findings = []
            for i, f in enumerate(data.get("findings", [])):
                finding = Finding(
                    id=f.get("id", f"{self.agent_name}_{i + 1}"),
                    severity=f.get("severity", "MEDIUM"),
                    category=f.get("category", "General"),
                    file_path=f.get("file_path", "unknown"),
                    line_number=f.get("line_number"),
                    description=f.get("description", ""),
                    recommendation=f.get("recommendation", ""),
                    confidence=max(0, min(100, f.get("confidence", 70))),
                    source=f.get("source", "llm_inferred"),
                    verified=f.get("verified", False),
                    veto_active=f.get("veto_active", False),
                )
                findings.append(finding)

            return AgentOutput(
                agent_name=data.get("agent_name", self.agent_name),
                status=data.get("status", "complete"),
                findings=findings,
                summary=data.get("summary", ""),
                top_priority=data.get("top_priority", ""),
            )
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"[{self.agent_name}] Failed to parse output: {e}")
            raise ValueError(f"Invalid agent output: {e}")

    async def analyze(self, context: AnalysisContext) -> AgentOutput:
        """Run the full agent analysis with retry and timeout."""
        start_time = time.time()
        system_prompt = self.get_system_prompt()
        user_prompt = self.build_user_prompt(context)

        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"[{self.agent_name}] Attempt {attempt}/{self.max_retries}")

                # Apply timeout
                raw_output = await asyncio.wait_for(
                    self.call_llm(system_prompt, user_prompt),
                    timeout=self.settings.agent_timeout_seconds,
                )

                output = self.parse_output(raw_output)
                duration_ms = int((time.time() - start_time) * 1000)
                logger.info(
                    f"[{self.agent_name}] Complete in {duration_ms}ms "
                    f"with {len(output.findings)} findings"
                )
                return output

            except asyncio.TimeoutError:
                logger.warning(f"[{self.agent_name}] Timed out after {self.settings.agent_timeout_seconds}s")
                last_error = "Agent timed out"
            except ValueError as e:
                logger.warning(f"[{self.agent_name}] Parse error on attempt {attempt}: {e}")
                last_error = str(e)
                # On parse failure, add a retry hint to the prompt
                if attempt < self.max_retries:
                    user_prompt = (
                        "IMPORTANT: Your previous response was not valid JSON. "
                        "Return ONLY a valid JSON object matching the schema. "
                        "No preamble, no explanation outside the JSON.\n\n"
                        + user_prompt
                    )
            except Exception as e:
                logger.error(f"[{self.agent_name}] Unexpected error: {e}")
                last_error = str(e)

        # All retries exhausted — return failed output
        logger.error(f"[{self.agent_name}] Failed after {self.max_retries} attempts: {last_error}")
        return AgentOutput(
            agent_name=self.agent_name,
            status="failed",
            findings=[],
            summary=f"Agent failed: {last_error}",
            top_priority="",
        )

    # ── Discussion Phase Methods ──

    DISCUSSION_SYSTEM_PROMPT = """DISCUSSION PHASE INSTRUCTIONS

You have completed your independent analysis. You will now receive the findings
from the other specialist agents. Your job is NOT to add new findings.

Your job is to READ the other agents' findings and RESPOND to them directly.

You MUST reference the exact finding ID (e.g. architect_1, security_2) in every response.
You MUST produce at least ONE challenge or escalation per discussion round.
Saying "I agree with everything" is not permitted.

Return a JSON object with a "responses" array. Each object must have these fields:
  - "type": one of "challenge", "escalate", "agree", "concede"
  - "target_agent": the agent name you are responding to
  - "target_finding_id": the finding ID you are responding to
  - "message": your detailed response (start with CHALLENGE/ESCALATING/CONFIRMING/CONCEDING)
  - "confidence": 0-100

AGENT-SPECIFIC DEBATE RULES:

Security Agent:
  - MUST challenge any Architect recommendation that adds new services,
    increases network exposure, or removes input validation
  - MUST escalate any finding from another agent that touches auth, secrets,
    or injection — even if that agent rated it LOW

Architect Agent:
  - MUST challenge any Security recommendation where implementation cost is
    disproportionate to risk at the project's current scale
  - MUST challenge Code Reviewer findings that recommend structural changes
    the Architect disagrees with

Code Reviewer Agent:
  - MUST flag if a Security fix would introduce code quality problems
    (e.g., duplicated validation, increased complexity)
  - MUST challenge Architect findings that conflict with observed code patterns
"""

    def _format_findings_for_debate(
        self,
        agent_outputs: list[AgentOutput],
        exclude_agent: str | None = None,
    ) -> str:
        """Format all agents' findings for the debate prompt."""
        sections = []
        for output in agent_outputs:
            if output.agent_name == exclude_agent:
                continue
            findings_text = []
            for f in output.findings:
                findings_text.append(
                    f"  [{f.id}] [{f.severity}] {f.category} — {f.file_path}"
                    f"\n    Description: {f.description}"
                    f"\n    Recommendation: {f.recommendation}"
                    f"\n    Confidence: {f.confidence}%"
                )
            section = (
                f"--- {output.agent_name.upper()} FINDINGS ({len(output.findings)} total) ---\n"
                f"Summary: {output.summary}\n"
                + "\n".join(findings_text)
                + "\n--- END ---"
            )
            sections.append(section)
        return "\n\n".join(sections)

    def _format_prior_debate(self, prior_turns: list[dict]) -> str:
        """Format prior debate turns for context."""
        if not prior_turns:
            return "No prior debate turns."
        lines = []
        for t in prior_turns:
            lines.append(
                f"[Round {t.get('round', '?')}] {t.get('agent', '?')} "
                f"({t.get('type', '?')}) → {t.get('target_agent', '?')}/"
                f"{t.get('target_finding_id', '?')}: {t.get('message', '')[:200]}"
            )
        return "\n".join(lines)

    async def discuss(
        self,
        own_output: AgentOutput,
        all_outputs: list[AgentOutput],
        prior_turns: list[dict],
        round_number: int,
    ) -> list[dict]:
        """Run a discussion round: read other agents' findings and respond."""
        other_findings_text = self._format_findings_for_debate(all_outputs, exclude_agent=self.agent_name)
        own_findings_text = self._format_findings_for_debate([own_output])
        prior_debate_text = self._format_prior_debate(prior_turns)

        user_prompt = f"""DISCUSSION ROUND {round_number}

You are the {self.agent_name.replace('_', ' ').title()} agent.

YOUR OWN FINDINGS:
{own_findings_text}

OTHER AGENTS' FINDINGS:
{other_findings_text}

PRIOR DEBATE TURNS:
{prior_debate_text}

Now respond to the other agents' findings. You MUST produce at least one CHALLENGE or ESCALATE response.
Return a JSON object: {{"responses": [...]}}
"""
        try:
            raw = await asyncio.wait_for(
                self.call_llm(self.DISCUSSION_SYSTEM_PROMPT, user_prompt),
                timeout=20,
            )
            return self._parse_discussion_output(raw)
        except Exception as e:
            logger.warning(f"[{self.agent_name}] Discussion round {round_number} failed: {e}")
            return []

    async def force_challenge(self, all_outputs: list[AgentOutput]) -> list[dict]:
        """Force at least one challenge when agent produced none in round 1."""
        other_findings_text = self._format_findings_for_debate(all_outputs, exclude_agent=self.agent_name)

        prompt = f"""You produced no challenges in round 1. This is not acceptable.
Review the following findings from other agents:

{other_findings_text}

Identify the single finding you most disagree with, or the finding where the severity
is most incorrect, and produce exactly one CHALLENGE response.
You must disagree with something. If the findings are mostly correct,
challenge the severity rating or the recommended fix approach.

Return a JSON object: {{"responses": [<exactly one CHALLENGE object>]}}
"""
        try:
            raw = await asyncio.wait_for(
                self.call_llm(self.DISCUSSION_SYSTEM_PROMPT, prompt),
                timeout=15,
            )
            return self._parse_discussion_output(raw)
        except Exception as e:
            logger.warning(f"[{self.agent_name}] force_challenge failed: {e}")
            return []

    def _parse_discussion_output(self, raw: str) -> list[dict]:
        """Parse discussion LLM response into list of debate turn dicts."""
        try:
            data = json.loads(raw)
            responses = data.get("responses", [])
            if not isinstance(responses, list):
                responses = [responses]

            valid = []
            for r in responses:
                turn_type = r.get("type", "agree")
                if turn_type not in ("challenge", "escalate", "agree", "concede"):
                    turn_type = "agree"
                valid.append({
                    "type": turn_type,
                    "target_agent": r.get("target_agent", "unknown"),
                    "target_finding_id": r.get("target_finding_id", "unknown"),
                    "message": r.get("message", ""),
                    "confidence": max(0, min(100, r.get("confidence", 70))),
                })
            return valid
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"[{self.agent_name}] Failed to parse discussion output: {e}")
            return []

