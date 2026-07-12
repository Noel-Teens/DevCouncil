"""
Auth router — GitHub OAuth + JWT token management.
Supports guest mode for demo usage without login.
"""

import logging
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from jose import jwt

from app.config import get_settings
from app.models.db import get_db, User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends
from app.models.schemas import AuthCallbackRequest, TokenResponse, UserResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


async def require_auth(request: Request) -> dict:
    """FastAPI dependency — extracts and validates JWT. Returns 401 if invalid."""
    token = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        token = request.cookies.get("token")

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = verify_jwt_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload


def create_jwt_token(user_data: dict) -> str:
    """Create a JWT token for a user."""
    settings = get_settings()
    payload = {
        "sub": user_data.get("id", "guest"),
        "username": user_data.get("username", "guest"),
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.jwt_expiry_days),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_jwt_token(token: str) -> dict | None:
    """Verify and decode a JWT token."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except Exception:
        return None


@router.post("/github/callback", response_model=TokenResponse)
async def github_callback(request: AuthCallbackRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Exchange GitHub OAuth code for access token, then create JWT."""
    settings = get_settings()

    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth not configured. Use guest mode.",
        )

    # Exchange code for access token. GitHub's token endpoint is most reliable
    # with a form-encoded body; Accept: application/json controls the response.
    async with httpx.AsyncClient(timeout=20.0) as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": request.code,
            },
            headers={"Accept": "application/json"},
        )

        if token_resp.status_code != 200:
            logger.error(f"GitHub token endpoint returned {token_resp.status_code}: {token_resp.text[:300]}")
            raise HTTPException(status_code=400, detail="Failed to exchange OAuth code")

        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            # Surface the ACTUAL GitHub error instead of a generic message.
            gh_error = token_data.get("error", "unknown_error")
            gh_desc = token_data.get("error_description", "")
            logger.error(f"GitHub OAuth exchange failed: {gh_error} — {gh_desc} — client_id={settings.github_client_id}")
            raise HTTPException(status_code=400, detail=f"{gh_error}: {gh_desc}".strip(": "))

        # Fetch user info
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )

        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch GitHub user")

        user_data = user_resp.json()
        github_id_str = str(user_data.get("id"))

    # Upsert user into DB
    result = await db.execute(select(User).where(User.github_id == github_id_str))
    user = result.scalar_one_or_none()
    if user:
        user.github_token = access_token
        user.username = user_data.get("login", "unknown")
        user.email = user_data.get("email")
    else:
        user = User(
            id=github_id_str,
            github_id=github_id_str,
            github_token=access_token,
            username=user_data.get("login", "unknown"),
            email=user_data.get("email"),
        )
        db.add(user)
    await db.commit()

    # Create JWT
    jwt_token = create_jwt_token({
        "id": str(user_data.get("id")),
        "username": user_data.get("login", "unknown"),
        "email": user_data.get("email"),
        "github_id": str(user_data.get("id")),
    })

    # Set httponly cookie
    response.set_cookie(
        key="token",
        value=jwt_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.jwt_expiry_days * 86400,
    )

    return TokenResponse(access_token=jwt_token)


@router.post("/guest", response_model=TokenResponse)
async def guest_login(response: Response):
    """Create a guest JWT for demo usage."""
    jwt_token = create_jwt_token({
        "id": "guest",
        "username": "guest",
    })

    response.set_cookie(
        key="token",
        value=jwt_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=86400,  # 1 day for guests
    )

    return TokenResponse(access_token=jwt_token)


@router.get("/me", response_model=None)
async def get_current_user(request: Request):
    """Get current user info from JWT token."""
    # Try Authorization header first, then cookie
    token = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        token = request.cookies.get("token")

    if not token:
        return {"id": "guest", "username": "guest", "email": None, "github_id": "guest"}

    payload = verify_jwt_token(token)
    if not payload:
        return {"id": "guest", "username": "guest", "email": None, "github_id": "guest"}

    return {
        "id": payload.get("sub", "guest"),
        "username": payload.get("username", "guest"),
        "email": payload.get("email"),
        "github_id": payload.get("github_id", payload.get("sub", "guest")),
    }
