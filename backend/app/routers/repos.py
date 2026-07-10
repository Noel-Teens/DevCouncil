"""
Repos router — Fetching user's GitHub repositories.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db import User, get_db
from app.routers.auth import require_auth

router = APIRouter(prefix="/repos", tags=["repos"])


@router.get("")
async def get_user_repos(user: dict = Depends(require_auth), db: AsyncSession = Depends(get_db)):
    """Fetch the authenticated user's repositories from GitHub."""
    user_id = user.get("sub")
    if not user_id or user_id == "guest":
        return []

    # Get user from DB to retrieve the GitHub token
    result = await db.execute(select(User).where(User.github_id == user_id))
    db_user = result.scalar_one_or_none()
    
    if not db_user or not db_user.github_token:
        raise HTTPException(status_code=401, detail="GitHub token not found. Please log in again.")
        
    async with httpx.AsyncClient() as client:
        # Fetch repos (sorted by updated, limit to 10 for simplicity)
        resp = await client.get(
            "https://api.github.com/user/repos?sort=updated&per_page=10",
            headers={
                "Authorization": f"Bearer {db_user.github_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch repositories from GitHub.")
            
        repos = resp.json()
        
    # Return a simplified list of repositories
    return [
        {
            "id": repo.get("id"),
            "name": repo.get("name"),
            "full_name": repo.get("full_name"),
            "html_url": repo.get("html_url"),
            "description": repo.get("description"),
            "language": repo.get("language"),
            "updated_at": repo.get("updated_at"),
        }
        for repo in repos
    ]
