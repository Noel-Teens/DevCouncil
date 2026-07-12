"""
Reports router — user analysis history.
Reads from the in-memory cache first, then falls back to the database so
history survives a backend restart.
"""

import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.models.db import Analysis, ConsensusReportRecord, async_session
from app.services.orchestrator import _analysis_results, load_analysis_from_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])


_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]


def _count_severities(findings: list[dict]) -> dict[str, int]:
    counts = {s: 0 for s in _SEVERITIES}
    verified = 0
    for f in findings or []:
        sev = str(f.get("severity", "")).upper()
        if sev in counts:
            counts[sev] += 1
        if f.get("verified"):
            verified += 1
    counts["VERIFIED"] = verified
    return counts


@router.get("")
async def list_reports():
    """List all completed analyses (in-memory + persisted) with severity stats."""
    reports: list[dict] = []
    seen: set[str] = set()
    totals = {s: 0 for s in _SEVERITIES}
    totals["VERIFIED"] = 0

    def _accumulate(findings: list[dict]) -> dict[str, int]:
        counts = _count_severities(findings)
        for k, v in counts.items():
            totals[k] = totals.get(k, 0) + v
        return counts

    # In-memory results first (freshest)
    for analysis_id, result in _analysis_results.items():
        seen.add(analysis_id)
        findings = result.get("consensus_report", {}).get("findings", []) if result.get("consensus_report") else []
        counts = _accumulate(findings)
        reports.append({
            "analysis_id": analysis_id,
            "status": result.get("status", "unknown"),
            "repo_url": result.get("repo_url", ""),
            "repo_name": result.get("repo_name", ""),
            "completed_at": result.get("completed_at"),
            "finding_count": len(findings),
            "severity_counts": counts,
        })

    # Fall back to the database for anything not in memory
    try:
        async with async_session() as session:
            rows = (
                await session.execute(select(Analysis).order_by(Analysis.created_at.desc()))
            ).scalars().all()
            for a in rows:
                if a.id in seen:
                    continue
                report = (
                    await session.execute(
                        select(ConsensusReportRecord).where(
                            ConsensusReportRecord.analysis_id == a.id
                        )
                    )
                ).scalar_one_or_none()
                findings = (report.findings or []) if report else []
                counts = _accumulate(findings)
                reports.append({
                    "analysis_id": a.id,
                    "status": a.status,
                    "repo_url": a.repo_url,
                    "repo_name": a.repo_name or "",
                    "completed_at": a.completed_at.isoformat() if a.completed_at else None,
                    "finding_count": len(findings),
                    "severity_counts": counts,
                })
    except Exception as e:
        logger.warning(f"Could not list reports from DB: {e}")

    return {"reports": reports, "severity_totals": totals}


@router.get("/{analysis_id}")
async def get_report(analysis_id: str):
    """Get a specific analysis report."""
    result = _analysis_results.get(analysis_id)
    if result:
        return result

    db_result = await load_analysis_from_db(analysis_id)
    if db_result:
        return db_result

    raise HTTPException(status_code=404, detail="Report not found")
