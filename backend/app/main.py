"""
DevCouncil AI — FastAPI Backend
Multi-agent AI code review platform.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models.db import init_db
from app.routers import analysis, auth, reports

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting DevCouncil AI Backend...")
    await init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down DevCouncil AI Backend...")


app = FastAPI(
    title="DevCouncil AI",
    description="Multi-agent AI code review platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(analysis.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(reports.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "DevCouncil AI Backend",
        "version": "0.1.0",
    }


@app.get("/api/health")
async def api_health():
    return {"status": "ok"}
