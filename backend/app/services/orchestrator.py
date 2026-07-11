"""
Orchestrator — runs the full analysis pipeline:
  Phase 0: Ingestion + validation
  Phase 1: Parallel agent analysis (asyncio.gather)
  Phase 2: Structured debate (3 rounds, sequential)
  Phase 3: Consensus synthesis
All events emitted to SSE queue for real-time streaming.
"""

import asyncio
import json
import logging
import re
import time
from datetime import datetime, timezone

from app.agents.architect import ArchitectAgent
from app.agents.code_reviewer import CodeReviewerAgent
from app.agents.consensus_director import ConsensusDirectorAgent
from app.agents.security import SecurityAgent
from app.models.schemas import (
    AgentEvent,
    AgentOutput,
    AgentSummary,
    AnalysisContext,
    AnalysisStatus,
    ConsensusReport,
    DiscussionTurn,
    EventType,
    Finding,
    TurnType,
)
from app.models.db import async_session
from app.services.cache import cache_set_json
from app.services.ingestion import ingest_repository

logger = logging.getLogger(__name__)

# In-memory event queues per analysis — maps analysis_id to list of events
_event_queues: dict[str, asyncio.Queue] = {}
# Store completed analysis results
_analysis_results: dict[str, dict] = {}


def get_event_queue(analysis_id: str) -> asyncio.Queue:
    """Get or create the event queue for an analysis."""
    if analysis_id not in _event_queues:
        _event_queues[analysis_id] = asyncio.Queue()
    return _event_queues[analysis_id]


def get_analysis_result(analysis_id: str) -> dict | None:
    """Get completed analysis result."""
    return _analysis_results.get(analysis_id)


async def emit_event(analysis_id: str, event: AgentEvent):
    """Push an event to the SSE queue."""
    queue = get_event_queue(analysis_id)
    await queue.put(event)
    logger.debug(f"[{analysis_id}] Emitted event: {event.event_type}")


# ─────────────────────────────────────────────────────────
# Fix 1 — Repository Validation Gate
# ─────────────────────────────────────────────────────────

CONFIG_ONLY_EXTENSIONS = {
    ".gradle", ".properties", ".xml", ".yaml", ".json",
    ".lock", ".toml", ".xcworkspace", ".pbxproj", ".dart",
}

BUSINESS_LOGIC_PATTERNS = [
    # Database / ORM
    r"(?:SELECT|INSERT|UPDATE|DELETE)\s+",
    r"\.query\s*\(", r"\.execute\s*\(",
    r"session\.(add|commit|query|execute)",
    r"\.findOne|\.findMany|\.create\s*\(",
    r"prisma\.", r"sequelize\.", r"mongoose\.",
    # HTTP routes
    r"@(app|router)\.(get|post|put|delete|patch)\s*\(",
    r"router\.(get|post|put|delete|patch)\s*\(",
    r"app\.(get|post|put|delete|patch)\s*\(",
    r"express\s*\(\s*\)", r"fastify\s*\(",
    # Auth
    r"(jwt|bcrypt|session|oauth|password|token)",
    # External API
    r"(requests\.(get|post)|fetch\s*\(|axios\.(get|post)|http\.(get|post))",
    # File I/O
    r"(open\s*\(|readFile|writeFile|fs\.)",
]


class InsufficientCodebaseError(Exception):
    """Raised when a repository doesn't contain enough application code."""
    pass


def validate_repository(context: AnalysisContext) -> None:
    """Validate that the repository has enough real application code to analyze.
    Raises InsufficientCodebaseError if the repo is mostly config/scaffold.
    """
    app_code_exts = {".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".java", ".rb", ".rs", ".cs"}

    # Count application code files
    app_files = [
        f for f in context.file_tree
        if any(f.path.endswith(ext) for ext in app_code_exts)
    ]

    # Count total lines of application code (approximate from file sizes)
    total_code_lines = 0
    for fc in context.file_contents:
        if any(fc.path.endswith(ext) for ext in app_code_exts):
            total_code_lines += fc.content.count("\n")

    # Check if all files are config-only
    all_config = all(
        any(f.path.endswith(ext) for ext in CONFIG_ONLY_EXTENSIONS)
        for f in context.file_tree
    )

    # Check AST for function/class definitions
    has_functions = len(context.ast_summary.functions) > 0
    has_classes = len(context.ast_summary.classes) > 0

    # Check for business logic patterns in file contents
    has_business_logic = False
    has_substantial_function = False
    for fc in context.file_contents:
        for pattern in BUSINESS_LOGIC_PATTERNS:
            if re.search(pattern, fc.content, re.IGNORECASE):
                has_business_logic = True
                break
        # Check for function bodies > 5 lines
        func_bodies = re.findall(
            r"(?:def |function |async function |const \w+ = (?:async )?\([^)]*\) =>)\s*[^{]*\{?([^}]{200,})",
            fc.content,
        )
        if func_bodies:
            has_substantial_function = True

    # Apply rejection rules
    reasons = []
    if total_code_lines < 200:
        reasons.append(f"Only {total_code_lines} lines of application code (minimum: 200)")
    if not has_functions and not has_classes:
        reasons.append("Zero function or class definitions detected")
    if all_config:
        reasons.append("All files are configuration/build files only")
    if len(app_files) < 3:
        reasons.append(f"Only {len(app_files)} application code files (minimum: 3)")

    # Accept only if meaningful code exists
    if reasons and (not has_business_logic or not has_substantial_function):
        logger.warning(f"Repository rejected: {reasons}")
        raise InsufficientCodebaseError(
            "This repository contains primarily configuration or scaffold files "
            "with minimal application logic. DevCouncil AI is designed for "
            "repositories with real application code — routes, services, "
            "authentication, database access, or business logic. "
            "Try a Python, JavaScript, TypeScript, Go, or Java application."
        )


# ─────────────────────────────────────────────────────────
# Fix 3 — Finding Quality Filter
# ─────────────────────────────────────────────────────────

CONFIDENCE_THRESHOLDS = {
    "CRITICAL": 70,
    "HIGH": 65,
    "MEDIUM": 60,
    "LOW": 55,
    "INFO": 999,  # Always suppress INFO
}

SECURITY_CATEGORIES = {
    "CVE", "Injection", "XSS", "Hardcoded Secret", "Broken Auth",
    "CSRF", "Security Misconfiguration", "Network Exposure",
}

ARCHITECT_CATEGORIES = {
    "Code Smell", "Architecture Pattern", "Naming", "Complexity",
    "Dependency Management",
}

VAGUE_PHRASES = [
    "may cause issues",
    "could lead to problems",
    "might introduce risks",
    "should be reviewed",
    "potential security risk",
    "may introduce",
    "could potentially",
]


def ground_findings_with_bandit(
    findings: list[Finding], bandit_findings: list[dict]
) -> int:
    """Mark findings that match real Bandit output as verified.

    Truth comes from the scanner, not the LLM's self-reported ``verified`` flag.
    A finding is grounded when its file (exact or suffix match) and line number
    (within ±3 lines to tolerate the LLM's off-by-a-little citations) coincide
    with a Bandit result. Returns the number of findings grounded.
    """
    if not bandit_findings:
        return 0

    grounded = 0
    for f in findings:
        f_path = (f.file_path or "").replace("\\", "/")
        for b in bandit_findings:
            b_path = (b.get("file_path") or "").replace("\\", "/")
            path_match = bool(f_path) and (
                f_path == b_path
                or f_path.endswith(b_path)
                or b_path.endswith(f_path)
            )
            if not path_match:
                continue
            b_line = b.get("line_number")
            if f.line_number is not None and b_line is not None:
                if abs(f.line_number - b_line) > 3:
                    continue
            # Grounded — anchor it to the scanner.
            f.verified = True
            f.source = "bandit"
            grounded += 1
            break
    return grounded


def filter_finding(finding: Finding, agent_name: str) -> bool:
    """Return True if finding passes all quality gates, False to suppress."""
    severity = finding.severity.value if hasattr(finding.severity, "value") else str(finding.severity)

    # GATE 1 — Confidence threshold
    threshold = CONFIDENCE_THRESHOLDS.get(severity, 60)
    if finding.confidence < threshold:
        logger.debug(f"Suppressed {finding.id}: confidence {finding.confidence} < {threshold}")
        return False

    # INFO is always suppressed
    if severity == "INFO":
        return False

    desc = finding.description
    rec = finding.recommendation

    # GATE 2 — Specificity (must cite something real)
    has_file_path = bool(re.search(r"[a-zA-Z0-9_\-]+\.[a-z]{1,5}(?::[Ll]?\d+)?", desc))
    has_function = bool(re.search(r"\w+\(\)", desc))
    has_line = bool(re.search(r"(?:line\s*|:L?)\d+", desc, re.IGNORECASE))
    has_dep_version = bool(re.search(r"\w+@[\d.]+", desc))

    if not (has_file_path or has_function or has_line or has_dep_version):
        # Check if file_path field has a real path (not "unknown")
        if finding.file_path in ("unknown", "", "N/A"):
            logger.debug(f"Suppressed {finding.id}: no specific file/function/line reference")
            return False

    # GATE 3 — Concrete consequence (reject vague language)
    combined = f"{desc} {rec}".lower()
    vague_count = sum(1 for phrase in VAGUE_PHRASES if phrase in combined)
    # If the description is ONLY vague with no concrete language, suppress
    has_concrete = bool(re.search(
        r"(results? in|causes?|leads? to|enables?|allows?|exposes?|"
        r"OOM|crash|data loss|unauthorized|injection|bypass|leak|breach|"
        r"denial of service|remote code|privilege escalation)",
        combined,
    ))
    if vague_count > 0 and not has_concrete:
        logger.debug(f"Suppressed {finding.id}: vague consequence without concrete impact")
        return False

    # GATE 4 — Domain boundary
    category = finding.category
    if agent_name == "security" and category in ARCHITECT_CATEGORIES:
        logger.debug(f"Suppressed {finding.id}: security agent out of domain ({category})")
        return False
    if agent_name == "architect" and category in SECURITY_CATEGORIES:
        logger.debug(f"Suppressed {finding.id}: architect agent out of domain ({category})")
        return False
    if agent_name == "code_reviewer" and category in SECURITY_CATEGORIES:
        logger.debug(f"Suppressed {finding.id}: code_reviewer agent out of domain ({category})")
        return False

    return True


# ─────────────────────────────────────────────────────────
# Pipeline
# ─────────────────────────────────────────────────────────

async def run_analysis_pipeline(
    analysis_id: str, repo_url: str, user_id: str | None = None
):
    """Full analysis pipeline: ingest → validate → analyze → debate → consensus.

    Owns its own DB session (this runs as a background task, after the request
    session has closed) so every run is persisted and survives a restart.
    """
    await _create_analysis_row(analysis_id, repo_url, user_id)
    try:
        # ── Phase 0: Ingestion ──
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.STATUS_UPDATE,
            data={"status": AnalysisStatus.INGESTING, "message": "Fetching repository..."},
        ))

        context = await ingest_repository(repo_url)

        # ── Validation Gate (Fix 1) ──
        try:
            validate_repository(context)
        except InsufficientCodebaseError as e:
            await emit_event(analysis_id, AgentEvent(
                event_type=EventType.ANALYSIS_FAILED,
                data={
                    "message": str(e),
                    "error_code": "INSUFFICIENT_CODEBASE",
                    "suggested_repos": [
                        "https://github.com/OWASP/WebGoat",
                        "https://github.com/tiangolo/full-stack-fastapi-template",
                        "https://github.com/gothinkster/realworld",
                    ],
                },
            ))
            _analysis_results[analysis_id] = {
                "status": AnalysisStatus.FAILED,
                "repo_url": repo_url,
                "error": str(e),
            }
            await _mark_analysis_failed(analysis_id, str(e))
            return

        bandit_count = len(context.static_analysis.bandit_findings)
        ingest_msg = f"Ingested {len(context.file_tree)} files."
        if bandit_count:
            ingest_msg += f" Bandit flagged {bandit_count} potential issue(s) to ground Security findings."
        ingest_msg += " Starting agent analysis..."
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.STATUS_UPDATE,
            data={
                "status": AnalysisStatus.ANALYZING,
                "message": ingest_msg,
                "file_count": len(context.file_tree),
                "primary_language": context.primary_language,
                "bandit_findings": bandit_count,
            },
        ))

        # ── Phase 1: Parallel Agent Analysis ──
        agent_outputs, failed_agents = await _run_parallel_analysis(
            analysis_id, context
        )

        if not agent_outputs:
            await emit_event(analysis_id, AgentEvent(
                event_type=EventType.ANALYSIS_FAILED,
                data={"message": "All agents failed. Cannot produce analysis."},
            ))
            return

        # ── Phase 2: Structured Debate (Fix 2) ──
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.STATUS_UPDATE,
            data={"status": AnalysisStatus.DISCUSSING, "message": "Agents are debating findings..."},
        ))

        discussion_turns = await _run_discussion_phase(
            analysis_id, agent_outputs
        )

        # ── Phase 3: Consensus ──
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.CONSENSUS_START,
            data={"message": "Consensus Director is synthesizing the final report..."},
        ))

        consensus = await _run_consensus(
            analysis_id, agent_outputs, discussion_turns, failed_agents
        )

        # Rough cost estimate (Groq Llama-3.3-70b free tier): ~$0.002 per
        # specialist call + ~$0.03 for the consensus synthesis pass.
        cost_usd = round(len(agent_outputs) * 0.002 + 0.03, 4)

        # Store result
        _analysis_results[analysis_id] = {
            "status": AnalysisStatus.COMPLETE,
            "repo_url": repo_url,
            "repo_name": context.repo_name,
            "cost_usd": cost_usd,
            "agent_outputs": [o.model_dump() for o in agent_outputs],
            "discussion_turns": [t.model_dump() for t in discussion_turns],
            "consensus_report": consensus.model_dump(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }

        # Persist to the database (own session — survives restarts)
        async with async_session() as session:
            await _save_to_db(
                session, analysis_id, agent_outputs,
                discussion_turns, consensus,
                repo_name=context.repo_name,
                commit_sha=context.commit_sha,
                cost_usd=cost_usd,
            )

        # Populate the response cache so a repeat submit returns instantly
        await cache_set_json(
            f"analysis:{repo_url}", {"analysis_id": analysis_id}, ttl_seconds=86400
        )

        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.CONSENSUS_COMPLETE,
            data={
                "status": AnalysisStatus.COMPLETE,
                "report": consensus.model_dump(),
            },
        ))

        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.ANALYSIS_COMPLETE,
            data={"message": "Analysis complete."},
        ))

    except Exception as e:
        logger.error(f"[{analysis_id}] Pipeline failed: {e}", exc_info=True)
        _analysis_results[analysis_id] = {
            "status": AnalysisStatus.FAILED,
            "repo_url": repo_url,
            "error": str(e),
        }
        await _mark_analysis_failed(analysis_id, str(e))
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.ANALYSIS_FAILED,
            data={"message": f"Analysis failed: {str(e)}"},
        ))
    finally:
        # Signal end of stream
        queue = get_event_queue(analysis_id)
        await queue.put(None)


async def _run_parallel_analysis(
    analysis_id: str,
    context: AnalysisContext,
) -> tuple[list[AgentOutput], list[str]]:
    """Phase 1: Run all agents in parallel. Apply finding quality filter."""
    agents = [
        ArchitectAgent(),
        SecurityAgent(),
        CodeReviewerAgent(),
    ]

    # Emit agent start events
    for agent in agents:
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.AGENT_START,
            agent_name=agent.agent_name,
            data={"message": f"{agent.agent_name.replace('_', ' ').title()} is analyzing..."},
        ))

    # Run agents sequentially with stagger delay to avoid Groq TPM rate limits
    # (Free tier: 12,000 TPM — parallel calls would exceed this)
    results: list[AgentOutput | Exception] = []
    for i, agent in enumerate(agents):
        if i > 0:
            await asyncio.sleep(3)  # 3s stagger between agents
        try:
            result = await agent.analyze(context)
            results.append(result)
        except Exception as e:
            results.append(e)

    agent_outputs: list[AgentOutput] = []
    failed_agents: list[str] = []

    for agent, result in zip(agents, results):
        if isinstance(result, Exception):
            logger.error(f"[{agent.agent_name}] Failed with exception: {result}")
            failed_agents.append(agent.agent_name)
            await emit_event(analysis_id, AgentEvent(
                event_type=EventType.AGENT_FAILED,
                agent_name=agent.agent_name,
                data={"message": f"{agent.agent_name} failed: {str(result)}"},
            ))
        elif result.status == "failed":
            failed_agents.append(agent.agent_name)
            await emit_event(analysis_id, AgentEvent(
                event_type=EventType.AGENT_FAILED,
                agent_name=agent.agent_name,
                data={"message": result.summary},
            ))
        else:
            # Ground Security findings in real Bandit output before filtering,
            # so scanner-confirmed findings are marked verified and never dropped.
            if agent.agent_name == "security":
                grounded = ground_findings_with_bandit(
                    result.findings, context.static_analysis.bandit_findings
                )
                if grounded:
                    logger.info(f"[security] Grounded {grounded} finding(s) in Bandit output")

            # Fix 3 — Apply finding quality filter (verified findings bypass it)
            filtered_findings = [
                f for f in result.findings
                if f.verified or filter_finding(f, agent.agent_name)
            ]
            suppressed = len(result.findings) - len(filtered_findings)
            if suppressed > 0:
                logger.info(f"[{agent.agent_name}] Suppressed {suppressed} low-quality findings")
            result.findings = filtered_findings

            agent_outputs.append(result)
            # Emit each finding individually for real-time streaming
            for finding in result.findings:
                await emit_event(analysis_id, AgentEvent(
                    event_type=EventType.FINDING,
                    agent_name=agent.agent_name,
                    data=finding.model_dump(),
                ))
            await emit_event(analysis_id, AgentEvent(
                event_type=EventType.AGENT_COMPLETE,
                agent_name=agent.agent_name,
                data={
                    "message": f"{agent.agent_name} complete.",
                    "finding_count": len(result.findings),
                    "summary": result.summary,
                    "top_priority": result.top_priority,
                },
            ))

    return agent_outputs, failed_agents


async def _run_discussion_phase(
    analysis_id: str,
    agent_outputs: list[AgentOutput],
) -> list[DiscussionTurn]:
    """Phase 2: Structured debate — agents read each other's findings and respond.
    3 rounds max. Each agent produces challenges, escalations, agreements, or concessions.
    """
    discussion_turns: list[DiscussionTurn] = []

    # Only run discussion if we have 2+ agents
    if len(agent_outputs) < 2:
        return discussion_turns

    agent_map: dict[str, AgentOutput] = {o.agent_name: o for o in agent_outputs}

    agents = [
        ArchitectAgent(),
        SecurityAgent(),
        CodeReviewerAgent(),
    ]
    active_agents = [a for a in agents if a.agent_name in agent_map]

    all_debate_turns: list[dict] = []

    for round_num in range(1, 4):  # 3 rounds
        for agent in active_agents:
            own_output = agent_map[agent.agent_name]

            try:
                responses = await agent.discuss(
                    own_output=own_output,
                    all_outputs=agent_outputs,
                    prior_turns=all_debate_turns,
                    round_number=round_num,
                )

                # ENFORCEMENT: if zero challenges in round 1, force one
                challenges = [r for r in responses if r.get("type") in ("challenge", "escalate")]
                if len(challenges) == 0 and round_num == 1:
                    logger.info(f"[{agent.agent_name}] Forcing challenge (none produced in round 1)")
                    forced = await agent.force_challenge(agent_outputs)
                    responses.extend(forced)

                # Emit each response to SSE stream
                for response in responses:
                    turn_type_str = response.get("type", "agree")
                    # Map string type to TurnType enum
                    turn_type_map = {
                        "challenge": TurnType.CHALLENGE,
                        "escalate": TurnType.ESCALATE,
                        "agree": TurnType.AGREE,
                        "concede": TurnType.CONCEDE,
                    }
                    turn_type = turn_type_map.get(turn_type_str, TurnType.NEW_FINDING)

                    turn = DiscussionTurn(
                        round_number=round_num,
                        agent_name=agent.agent_name,
                        turn_type=turn_type,
                        target_agent=response.get("target_agent"),
                        target_finding_id=response.get("target_finding_id"),
                        message=response.get("message", ""),
                        confidence=response.get("confidence"),
                    )
                    discussion_turns.append(turn)

                    # Track for prior context
                    all_debate_turns.append({
                        "round": round_num,
                        "agent": agent.agent_name,
                        "type": turn_type_str,
                        "target_agent": response.get("target_agent"),
                        "target_finding_id": response.get("target_finding_id"),
                        "message": response.get("message", ""),
                        "confidence": response.get("confidence"),
                    })

                    await emit_event(analysis_id, AgentEvent(
                        event_type=EventType.DISCUSSION_MESSAGE,
                        agent_name=agent.agent_name,
                        data=turn.model_dump(),
                    ))

            except Exception as e:
                logger.warning(f"Discussion round {round_num} failed for {agent.agent_name}: {e}")

    return discussion_turns


async def _run_consensus(
    analysis_id: str,
    agent_outputs: list[AgentOutput],
    discussion_turns: list[DiscussionTurn],
    failed_agents: list[str],
) -> ConsensusReport:
    """Phase 3: Consensus Director synthesis."""
    director = ConsensusDirectorAgent()
    return await director.synthesize(agent_outputs, discussion_turns, failed_agents)


async def _create_analysis_row(analysis_id: str, repo_url: str, user_id: str | None):
    """Insert the Analysis row at pipeline start so status/history is tracked."""
    from app.models.db import Analysis

    # A guest JWT has sub="guest", which is not a real users row — store NULL
    # rather than risk a dangling FK reference.
    real_user_id = user_id if user_id and user_id != "guest" else None
    try:
        async with async_session() as session:
            session.add(Analysis(
                id=analysis_id,
                user_id=real_user_id,
                repo_url=repo_url,
                status="pending",
                started_at=datetime.now(timezone.utc),
            ))
            await session.commit()
    except Exception as e:
        logger.warning(f"[{analysis_id}] Could not create analysis row: {e}")


async def _mark_analysis_failed(analysis_id: str, error: str):
    """Best-effort update of the Analysis row to a failed state."""
    from app.models.db import Analysis
    from sqlalchemy import update

    try:
        async with async_session() as session:
            await session.execute(
                update(Analysis)
                .where(Analysis.id == analysis_id)
                .values(status="failed", completed_at=datetime.now(timezone.utc))
            )
            await session.commit()
    except Exception as e:
        logger.warning(f"[{analysis_id}] Could not mark analysis failed: {e}")


async def _save_to_db(
    db_session,
    analysis_id,
    agent_outputs,
    discussion_turns,
    consensus,
    repo_name: str | None = None,
    commit_sha: str | None = None,
    cost_usd: float | None = None,
):
    """Save analysis results to the database."""
    from app.models.db import (
        AgentOutputRecord,
        Analysis,
        ConsensusReportRecord,
        DiscussionTurnRecord,
    )
    from sqlalchemy import update

    try:
        # Update analysis status + metadata
        await db_session.execute(
            update(Analysis)
            .where(Analysis.id == analysis_id)
            .values(
                status="complete",
                repo_name=repo_name,
                commit_sha=commit_sha,
                cost_usd=cost_usd,
                completed_at=datetime.now(timezone.utc),
            )
        )

        # Save agent outputs
        for output in agent_outputs:
            record = AgentOutputRecord(
                analysis_id=analysis_id,
                agent_name=output.agent_name,
                status=output.status,
                findings=[f.model_dump() for f in output.findings],
                summary=output.summary,
            )
            db_session.add(record)

        # Save discussion turns
        for turn in discussion_turns:
            record = DiscussionTurnRecord(
                analysis_id=analysis_id,
                round_number=turn.round_number,
                agent_name=turn.agent_name,
                turn_type=turn.turn_type,
                target_agent=turn.target_agent,
                target_finding_id=turn.target_finding_id,
                message=turn.message,
                confidence=turn.confidence,
            )
            db_session.add(record)

        # Save consensus report
        report_record = ConsensusReportRecord(
            analysis_id=analysis_id,
            executive_summary=consensus.executive_summary,
            findings=[f.model_dump() for f in consensus.findings],
            action_plan=[a.model_dump() for a in consensus.action_plan],
            conflicts_resolved=[c.model_dump() for c in consensus.conflicts_resolved],
            agents_participated=consensus.agents_that_participated,
            agents_failed=consensus.agents_that_failed,
        )
        db_session.add(report_record)

        await db_session.commit()
        logger.info(f"[{analysis_id}] Results saved to database")

    except Exception as e:
        logger.error(f"[{analysis_id}] Failed to save to DB: {e}")
        await db_session.rollback()


async def load_analysis_from_db(analysis_id: str) -> dict | None:
    """Read-through fallback: reconstruct a completed analysis from the DB.

    Lets results survive a backend restart / free-tier sleep even after the
    in-memory ``_analysis_results`` cache is gone.
    """
    from app.models.db import (
        AgentOutputRecord,
        Analysis,
        ConsensusReportRecord,
        DiscussionTurnRecord,
    )
    from sqlalchemy import select

    try:
        async with async_session() as session:
            analysis = (
                await session.execute(select(Analysis).where(Analysis.id == analysis_id))
            ).scalar_one_or_none()
            if analysis is None:
                return None

            result: dict = {
                "status": analysis.status,
                "repo_url": analysis.repo_url,
                "repo_name": analysis.repo_name,
                "cost_usd": analysis.cost_usd,
                "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None,
            }

            outputs = (
                await session.execute(
                    select(AgentOutputRecord).where(AgentOutputRecord.analysis_id == analysis_id)
                )
            ).scalars().all()
            result["agent_outputs"] = [
                {
                    "agent_name": o.agent_name,
                    "status": o.status,
                    "findings": o.findings or [],
                    "summary": o.summary or "",
                    "top_priority": "",
                }
                for o in outputs
            ]

            turns = (
                await session.execute(
                    select(DiscussionTurnRecord).where(DiscussionTurnRecord.analysis_id == analysis_id)
                )
            ).scalars().all()
            result["discussion_turns"] = [
                {
                    "round_number": t.round_number,
                    "agent_name": t.agent_name,
                    "turn_type": t.turn_type,
                    "target_agent": t.target_agent,
                    "target_finding_id": t.target_finding_id,
                    "message": t.message,
                    "confidence": t.confidence,
                }
                for t in turns
            ]

            report = (
                await session.execute(
                    select(ConsensusReportRecord).where(
                        ConsensusReportRecord.analysis_id == analysis_id
                    )
                )
            ).scalar_one_or_none()
            if report is not None:
                result["consensus_report"] = {
                    "executive_summary": report.executive_summary or "",
                    "findings": report.findings or [],
                    "action_plan": report.action_plan or [],
                    "conflicts_resolved": report.conflicts_resolved or [],
                    "agents_that_participated": report.agents_participated or [],
                    "agents_that_failed": report.agents_failed or [],
                }

            return result
    except Exception as e:
        logger.warning(f"[{analysis_id}] Could not load analysis from DB: {e}")
        return None
