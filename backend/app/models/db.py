"""
SQLAlchemy models for all database tables.
"""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    github_id = Column(String(50), unique=True, nullable=False)
    github_token = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    username = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    analyses = relationship("Analysis", back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    repo_url = Column(String(500), unique=True, nullable=False)
    repo_name = Column(String(200), nullable=True)
    primary_language = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    analyses = relationship("Analysis", back_populates="project")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    status = Column(String(20), default="pending")
    repo_url = Column(String(500), nullable=False)
    repo_name = Column(String(200), nullable=True)
    commit_sha = Column(String(40), nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    cost_usd = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="analyses")
    user = relationship("User", back_populates="analyses")
    agent_outputs = relationship("AgentOutputRecord", back_populates="analysis")
    discussion_turns = relationship("DiscussionTurnRecord", back_populates="analysis")
    consensus_report = relationship(
        "ConsensusReportRecord", back_populates="analysis", uselist=False
    )


class AgentOutputRecord(Base):
    __tablename__ = "agent_outputs"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    agent_name = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")
    raw_output = Column(JSON, nullable=True)
    findings = Column(JSON, nullable=True)
    summary = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    analysis = relationship("Analysis", back_populates="agent_outputs")


class DiscussionTurnRecord(Base):
    __tablename__ = "discussion_turns"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    agent_name = Column(String(50), nullable=False)
    turn_type = Column(String(20), nullable=False)
    target_agent = Column(String(50), nullable=True)
    target_finding_id = Column(String(100), nullable=True)
    message = Column(Text, nullable=False)
    confidence = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    analysis = relationship("Analysis", back_populates="discussion_turns")


class ConsensusReportRecord(Base):
    __tablename__ = "consensus_reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    analysis_id = Column(String, ForeignKey("analyses.id"), unique=True, nullable=False)
    executive_summary = Column(Text, nullable=True)
    findings = Column(JSON, nullable=True)
    action_plan = Column(JSON, nullable=True)
    conflicts_resolved = Column(JSON, nullable=True)
    agents_participated = Column(JSON, nullable=True)
    agents_failed = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    analysis = relationship("Analysis", back_populates="consensus_report")


# ──────────────────────────────────────────────
# Database Engine & Session
# ──────────────────────────────────────────────

settings = get_settings()


def _normalize_pg_url(url: str) -> str:
    """Make any Neon/psql-style Postgres URL work with the asyncpg driver.

    Neon hands you a libpq URL like
      postgresql://user:pw@host/db?sslmode=require&channel_binding=require
    but our async engine needs the ``+asyncpg`` driver, and asyncpg does NOT
    understand ``sslmode``/``channel_binding`` (those are handled via
    connect_args instead). We also disable the dialect's prepared-statement
    cache so the connection is safe through Neon's PgBouncer pooler.
    """
    from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]

    parts = urlsplit(url)
    # Drop libpq-only params asyncpg rejects; keep everything else.
    drop = {"sslmode", "channel_binding", "options"}
    query = [(k, v) for k, v in parse_qsl(parts.query) if k.lower() not in drop]
    # PgBouncer (Neon pooler) is transaction-pooled — named prepared statements
    # break, so turn the dialect cache off.
    if not any(k == "prepared_statement_cache_size" for k, _ in query):
        query.append(("prepared_statement_cache_size", "0"))
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def _build_engine():
    """Create the async engine, adapting connection args per backend."""
    url = settings.database_url
    if url.startswith(("postgresql", "postgres")):
        return create_async_engine(
            _normalize_pg_url(url),
            echo=False,
            pool_pre_ping=True,  # Neon suspends idle computes — reconnect transparently
            connect_args={"ssl": "require", "statement_cache_size": 0},
        )
    return create_async_engine(url, echo=False)


engine = _build_engine()
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Create all tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    """Dependency for FastAPI endpoints."""
    async with async_session() as session:
        yield session
