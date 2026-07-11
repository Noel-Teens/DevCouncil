"""
Seeded demo replay.

Judges should never watch a live analysis (Groq latency, rate limits, or an
unlucky hallucination can wreck the WOW moment). This module replays a canned
scenario — real-shaped agent findings, a genuine debate, and a consensus report
— through the exact same SSE event path the live pipeline uses, so the
Discussion Room streams it live-feeling but it can never fail.

Scenarios live in ``app/demo/scenarios/*.json`` as structured domain data
(agent_outputs, discussion_turns, consensus_report); the event sequence is
generated here so the files stay compact and consistent with the real pipeline.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from app.models.schemas import AgentEvent, AnalysisStatus, EventType
from app.services.orchestrator import _analysis_results, emit_event, get_event_queue

logger = logging.getLogger(__name__)

_SCENARIO_DIR = Path(__file__).resolve().parent.parent / "demo" / "scenarios"

# Pacing (seconds) — tuned to feel live without dragging.
_FINDING_DELAY = 0.7
_DISCUSSION_DELAY = 1.2
_PHASE_DELAY = 0.9


def list_scenarios() -> list[str]:
    """Return available scenario names (filenames without extension)."""
    if not _SCENARIO_DIR.exists():
        return []
    return sorted(p.stem for p in _SCENARIO_DIR.glob("*.json"))


def load_scenario(name: str) -> dict | None:
    """Load a scenario JSON by name. Returns None if it doesn't exist."""
    # Guard against path traversal — only a bare stem is allowed.
    safe = Path(name).stem
    path = _SCENARIO_DIR / f"{safe}.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        logger.warning(f"Could not load demo scenario '{name}': {e}")
        return None


async def run_demo_replay(analysis_id: str, scenario: dict):
    """Replay a scenario's events into the analysis SSE queue with pacing."""
    try:
        repo_name = scenario.get("repo_name", "demo/repo")
        bandit_count = scenario.get("bandit_findings", 0)
        agent_outputs = scenario.get("agent_outputs", [])
        discussion_turns = scenario.get("discussion_turns", [])
        consensus_report = scenario.get("consensus_report", {})

        # ── Phase 0: Ingestion ──
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.STATUS_UPDATE,
            data={"status": AnalysisStatus.INGESTING,
                  "message": f"Fetching {repo_name}..."},
        ))
        await asyncio.sleep(_PHASE_DELAY)

        ingest_msg = f"Ingested {scenario.get('file_count', 24)} files."
        if bandit_count:
            ingest_msg += f" Bandit flagged {bandit_count} potential issue(s) to ground Security findings."
        ingest_msg += " Starting agent analysis..."
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.STATUS_UPDATE,
            data={"status": AnalysisStatus.ANALYZING, "message": ingest_msg,
                  "bandit_findings": bandit_count},
        ))
        await asyncio.sleep(_PHASE_DELAY)

        # ── Phase 1: Parallel analysis (replayed sequentially) ──
        for output in agent_outputs:
            agent_name = output.get("agent_name", "architect")
            await emit_event(analysis_id, AgentEvent(
                event_type=EventType.AGENT_START,
                agent_name=agent_name,
                data={"message": f"{agent_name.replace('_', ' ').title()} is analyzing..."},
            ))
            await asyncio.sleep(_PHASE_DELAY)
            for finding in output.get("findings", []):
                await emit_event(analysis_id, AgentEvent(
                    event_type=EventType.FINDING,
                    agent_name=agent_name,
                    data=finding,
                ))
                await asyncio.sleep(_FINDING_DELAY)
            await emit_event(analysis_id, AgentEvent(
                event_type=EventType.AGENT_COMPLETE,
                agent_name=agent_name,
                data={
                    "message": f"{agent_name} complete.",
                    "finding_count": len(output.get("findings", [])),
                    "summary": output.get("summary", ""),
                    "top_priority": output.get("top_priority", ""),
                },
            ))
            await asyncio.sleep(_PHASE_DELAY)

        # ── Phase 2: Debate ──
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.STATUS_UPDATE,
            data={"status": AnalysisStatus.DISCUSSING,
                  "message": "Agents are debating findings..."},
        ))
        await asyncio.sleep(_PHASE_DELAY)
        for turn in discussion_turns:
            await emit_event(analysis_id, AgentEvent(
                event_type=EventType.DISCUSSION_MESSAGE,
                agent_name=turn.get("agent_name", "architect"),
                data=turn,
            ))
            await asyncio.sleep(_DISCUSSION_DELAY)

        # ── Phase 3: Consensus ──
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.CONSENSUS_START,
            data={"message": "Consensus Director is synthesizing the final report..."},
        ))
        await asyncio.sleep(_PHASE_DELAY)

        # Persist to the in-memory store so the report tab / getAnalysis work.
        _analysis_results[analysis_id] = {
            "status": AnalysisStatus.COMPLETE,
            "repo_url": scenario.get("repo_url", ""),
            "repo_name": repo_name,
            "cost_usd": scenario.get("cost_usd", 0.041),
            "is_demo": True,
            "agent_outputs": agent_outputs,
            "discussion_turns": discussion_turns,
            "consensus_report": consensus_report,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }

        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.CONSENSUS_COMPLETE,
            data={"status": AnalysisStatus.COMPLETE, "report": consensus_report},
        ))
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.ANALYSIS_COMPLETE,
            data={"message": "Analysis complete."},
        ))

    except Exception as e:
        logger.error(f"[{analysis_id}] Demo replay failed: {e}", exc_info=True)
        await emit_event(analysis_id, AgentEvent(
            event_type=EventType.ANALYSIS_FAILED,
            data={"message": f"Demo replay failed: {e}"},
        ))
    finally:
        # Signal end of stream (mirrors the real pipeline).
        await get_event_queue(analysis_id).put(None)
