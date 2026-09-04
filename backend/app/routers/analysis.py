"""
Analysis router — handles creating analyses and SSE streaming.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from app.models.schemas import (
    AgentEvent,
    AnalysisDetail,
    AnalysisRequest,
    AnalysisResponse,
    AnalysisStatus,
    ConsensusReport,
    EventType,
)
from app.services.cache import cache_get_json, cache_set_json, check_rate_limit
from app.services.demo_runner import list_scenarios, load_scenario, run_demo_replay
from app.services.ingestion import normalize_repo_url
from app.services.orchestrator import (
    get_analysis_result,
    get_event_queue,
    load_analysis_from_db,
    run_analysis_pipeline,
)
from app.routers.auth import require_auth

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analysis", tags=["analysis"])

# Track active analyses
_active_analyses: dict[str, dict] = {}


@router.post("", response_model=AnalysisResponse)
async def create_analysis(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
):
    """Submit a repository for analysis. Requires authentication."""
    repo_url = request.repo_url.strip()

    # Basic URL validation
    if not repo_url.startswith("https://github.com/") and not repo_url.startswith("http://github.com/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid repository URL. Please provide a valid GitHub URL (e.g., https://github.com/owner/repo)",
        )

    # Per-user daily rate limit (no-op unless Redis is configured)
    if not await check_rate_limit(user.get("sub", "anon"), max_per_day=20):
        raise HTTPException(
            status_code=429,
            detail="Daily analysis limit reached. Please try again tomorrow.",
        )

    # Check cache (normalized so http/https, trailing slash, .git all collide)
    cache_key = normalize_repo_url(repo_url)
    cached = await cache_get_json(f"analysis:{cache_key}")
    if cached:
        logger.info(f"Returning cached analysis for {repo_url}")
        return AnalysisResponse(
            analysis_id=cached["analysis_id"],
            status=AnalysisStatus.COMPLETE,
            repo_url=repo_url,
        )

    # Create new analysis
    analysis_id = str(uuid4())
    _active_analyses[analysis_id] = {
        "status": AnalysisStatus.PENDING,
        "repo_url": repo_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Start pipeline in background
    background_tasks.add_task(
        run_analysis_pipeline, analysis_id, repo_url, user.get("sub")
    )

    return AnalysisResponse(
        analysis_id=analysis_id,
        status=AnalysisStatus.PENDING,
        repo_url=repo_url,
    )


@router.get("/demo/scenarios")
async def get_demo_scenarios():
    """List available canned demo scenarios (no auth — used on the landing page)."""
    return {"scenarios": list_scenarios()}


@router.post("/demo/{scenario}", response_model=AnalysisResponse)
async def create_demo_analysis(scenario: str, background_tasks: BackgroundTasks):
    """Replay a canned scenario through the live SSE path. No auth, no Groq.

    Guaranteed, offline-safe demo — cannot rate-limit, time out, or hallucinate.
    """
    data = load_scenario(scenario)
    if data is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown demo scenario '{scenario}'. Available: {', '.join(list_scenarios())}",
        )

    analysis_id = str(uuid4())
    _active_analyses[analysis_id] = {
        "status": AnalysisStatus.PENDING,
        "repo_url": data.get("repo_url", ""),
        "is_demo": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    background_tasks.add_task(run_demo_replay, analysis_id, data)

    return AnalysisResponse(
        analysis_id=analysis_id,
        status=AnalysisStatus.PENDING,
        repo_url=data.get("repo_url", ""),
    )


@router.get("/{analysis_id}/stream")
async def stream_analysis(analysis_id: str):
    """SSE endpoint — streams agent events in real-time."""
    queue = get_event_queue(analysis_id)

    async def event_generator():
        try:
            while True:
                # Wait for the next event with a timeout for keepalive
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    # Send keepalive comment
                    yield {"event": "keepalive", "data": "{}"}
                    continue

                if event is None:
                    # Stream is done
                    yield {
                        "event": "done",
                        "data": json.dumps({"message": "Stream complete"}),
                    }
                    break

                yield {
                    "event": event.event_type.value if isinstance(event.event_type, EventType) else event.event_type,
                    "data": json.dumps(event.model_dump(), default=str),
                }
        except asyncio.CancelledError:
            logger.info(f"SSE stream cancelled for {analysis_id}")
        except Exception as e:
            logger.error(f"SSE stream error for {analysis_id}: {e}")

    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{analysis_id}", response_model=None)
async def get_analysis(analysis_id: str):
    """Get completed analysis result."""
    # Check in-memory results
    result = get_analysis_result(analysis_id)
    if result:
        return result

    # Read-through to the database (survives restarts / free-tier sleep)
    db_result = await load_analysis_from_db(analysis_id)
    if db_result:
        return db_result

    # Check active analyses
    if analysis_id in _active_analyses:
        return {
            "analysis_id": analysis_id,
            **_active_analyses[analysis_id],
        }

    raise HTTPException(status_code=404, detail="Analysis not found")
