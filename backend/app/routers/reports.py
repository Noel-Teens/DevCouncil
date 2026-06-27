"""
Reports router — user analysis history.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.services.orchestrator import _analysis_results

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
async def list_reports():
    """List all completed analyses (in-memory for MVP)."""
    reports = []
    for analysis_id, result in _analysis_results.items():
        reports.append({
            "analysis_id": analysis_id,
            "status": result.get("status", "unknown"),
            "repo_url": result.get("repo_url", ""),
            "repo_name": result.get("repo_name", ""),
            "completed_at": result.get("completed_at"),
            "finding_count": len(
                result.get("consensus_report", {}).get("findings", [])
            ) if result.get("consensus_report") else 0,
        })
    return {"reports": reports}


@router.get("/{analysis_id}")
async def get_report(analysis_id: str):
    """Get a specific analysis report."""
    result = _analysis_results.get(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Report not found")
    return result
