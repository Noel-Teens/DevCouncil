"""
Orchestrator — runs the full analysis pipeline:
  Phase 1: Parallel agent analysis (asyncio.gather)
  Phase 2: Discussion phase (sequential rounds)
  Phase 3: Consensus synthesis
All events emitted to SSE queue for real-time streaming.
"""

import asyncio
import json
import logging
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
    TurnType,
)
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


async def run_analysis_pipeline(analysis_id: str, repo_url: str, db_session=None):
    """Full analysis pipeline: ingest → analyze → discuss → consensus."""
    try:
        # ── Phase 0: Ingestion ──
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.STATUS_UPDATE,
            data={"status": AnalysisStatus.INGESTING, "message": "Fetching repository..."},
        ))

        context = await ingest_repository(repo_url)

        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.STATUS_UPDATE,
            data={
                "status": AnalysisStatus.ANALYZING,
                "message": f"Ingested {len(context.file_tree)} files. Starting agent analysis...",
                "file_count": len(context.file_tree),
                "primary_language": context.primary_language,
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

        # ── Phase 2: Discussion Phase ──
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.STATUS_UPDATE,
            data={"status": AnalysisStatus.DISCUSSING, "message": "Agents are debating findings..."},
        ))

        discussion_turns = await _run_discussion_phase(
            analysis_id, context, agent_outputs
        )

        # ── Phase 3: Consensus ──
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.CONSENSUS_START,
            data={"message": "Consensus Director is synthesizing the final report..."},
        ))

        consensus = await _run_consensus(
            analysis_id, agent_outputs, discussion_turns, failed_agents
        )

        # Store result
        _analysis_results[analysis_id] = {
            "status": AnalysisStatus.COMPLETE,
            "repo_url": repo_url,
            "repo_name": context.repo_name,
            "agent_outputs": [o.model_dump() for o in agent_outputs],
            "discussion_turns": [t.model_dump() for t in discussion_turns],
            "consensus_report": consensus.model_dump(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }

        # Save to database if session provided
        if db_session:
            await _save_to_db(
                db_session, analysis_id, agent_outputs,
                discussion_turns, consensus
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
    """Phase 1: Run all agents in parallel."""
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

    # Run all agents in parallel
    tasks = [agent.analyze(context) for agent in agents]
    results = await asyncio.gather(*tasks, return_exceptions=True)

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
    context: AnalysisContext,
    agent_outputs: list[AgentOutput],
) -> list[DiscussionTurn]:
    """Phase 2: Sequential discussion rounds.
    Each agent sees other agents' summaries and can challenge/agree.
    Max 3 rounds to keep total time under 15 seconds.
    """
    from app.config import get_settings
    settings = get_settings()

    discussion_turns: list[DiscussionTurn] = []

    # Build agent summaries for cross-referencing
    agent_map: dict[str, AgentOutput] = {o.agent_name: o for o in agent_outputs}

    # Only run discussion if we have 2+ agents
    if len(agent_outputs) < 2:
        return discussion_turns

    agents = [
        ArchitectAgent(),
        SecurityAgent(),
        CodeReviewerAgent(),
    ]
    active_agents = [a for a in agents if a.agent_name in agent_map]

    for round_num in range(1, min(settings.max_discussion_rounds + 1, 3)):
        for agent in active_agents:
            # Build context with other agents' summaries
            other_summaries = [
                AgentSummary(
                    agent_name=o.agent_name,
                    summary=o.summary,
                    top_priority=o.top_priority,
                    finding_count=len(o.findings),
                )
                for o in agent_outputs
                if o.agent_name != agent.agent_name
            ]

            discussion_context = context.model_copy()
            discussion_context.other_agent_summaries = other_summaries

            try:
                result = await asyncio.wait_for(
                    agent.analyze(discussion_context),
                    timeout=15,  # Shorter timeout for discussion
                )

                # Look for challenges in findings
                for finding in result.findings:
                    if "CHALLENGE" in finding.description.upper():
                        turn = DiscussionTurn(
                            round_number=round_num,
                            agent_name=agent.agent_name,
                            turn_type=TurnType.CHALLENGE,
                            target_agent=_extract_target_agent(finding.description),
                            target_finding_id=_extract_target_finding(finding.description),
                            message=finding.description,
                            confidence=finding.confidence,
                        )
                    else:
                        turn = DiscussionTurn(
                            round_number=round_num,
                            agent_name=agent.agent_name,
                            turn_type=TurnType.AGREE if round_num > 1 else TurnType.NEW_FINDING,
                            message=finding.description,
                            confidence=finding.confidence,
                        )

                    discussion_turns.append(turn)
                    await emit_event(analysis_id, AgentEvent(
                        event_type=EventType.DISCUSSION_MESSAGE,
                        agent_name=agent.agent_name,
                        data=turn.model_dump(),
                    ))

            except asyncio.TimeoutError:
                logger.warning(f"Discussion round {round_num} timed out for {agent.agent_name}")
            except Exception as e:
                logger.warning(f"Discussion error for {agent.agent_name}: {e}")

        # After round 1, just do a single summary round to save time/cost
        if round_num == 1:
            break

    return discussion_turns


def _extract_target_agent(description: str) -> str | None:
    """Extract the target agent name from a CHALLENGE description."""
    import re
    match = re.search(r"CHALLENGE\s+(\w+)_\d+", description, re.IGNORECASE)
    if match:
        return match.group(1)
    return None


def _extract_target_finding(description: str) -> str | None:
    """Extract the target finding ID from a CHALLENGE description."""
    import re
    match = re.search(r"CHALLENGE\s+(\w+_\d+)", description, re.IGNORECASE)
    if match:
        return match.group(1)
    return None


async def _run_consensus(
    analysis_id: str,
    agent_outputs: list[AgentOutput],
    discussion_turns: list[DiscussionTurn],
    failed_agents: list[str],
) -> ConsensusReport:
    """Phase 3: Consensus Director synthesis."""
    director = ConsensusDirectorAgent()
    return await director.synthesize(agent_outputs, discussion_turns, failed_agents)


async def _save_to_db(db_session, analysis_id, agent_outputs, discussion_turns, consensus):
    """Save analysis results to the database."""
    from app.models.db import (
        AgentOutputRecord,
        Analysis,
        ConsensusReportRecord,
        DiscussionTurnRecord,
    )
    from sqlalchemy import update

    try:
        # Update analysis status
        await db_session.execute(
            update(Analysis)
            .where(Analysis.id == analysis_id)
            .values(
                status="complete",
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
