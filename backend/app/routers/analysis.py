"""
Analysis router — handles creating analyses and SSE streaming.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException
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
from app.services.cache import cache_get_json, cache_set_json
from app.services.orchestrator import (
    get_analysis_result,
    get_event_queue,
    run_analysis_pipeline,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analysis", tags=["analysis"])

# Track active analyses
_active_analyses: dict[str, dict] = {}


@router.post("", response_model=AnalysisResponse)
async def create_analysis(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
):
    """Submit a repository for analysis."""
    repo_url = request.repo_url.strip()

    # Basic URL validation
    if not repo_url.startswith("https://github.com/") and not repo_url.startswith("http://github.com/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid repository URL. Please provide a valid GitHub URL (e.g., https://github.com/owner/repo)",
        )

    # Check cache
    cached = await cache_get_json(f"analysis:{repo_url}")
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
    background_tasks.add_task(run_analysis_pipeline, analysis_id, repo_url)

    return AnalysisResponse(
        analysis_id=analysis_id,
        status=AnalysisStatus.PENDING,
        repo_url=repo_url,
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

    # Check active analyses
    if analysis_id in _active_analyses:
        return {
            "analysis_id": analysis_id,
            **_active_analyses[analysis_id],
        }

    raise HTTPException(status_code=404, detail="Analysis not found")
