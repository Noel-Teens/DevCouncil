"""
Pydantic schemas for all API request/response types and agent data structures.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field, HttpUrl


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    INGESTING = "ingesting"
    ANALYZING = "analyzing"
    DISCUSSING = "discussing"
    CONSENSUS = "consensus"
    COMPLETE = "complete"
    FAILED = "failed"


class AgentStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETE = "complete"
    PARTIAL = "partial"
    FAILED = "failed"


class TurnType(str, Enum):
    CHALLENGE = "challenge"
    AGREE = "agree"
    CONCEDE = "concede"
    NEW_FINDING = "new_finding"


class EventType(str, Enum):
    STATUS_UPDATE = "status_update"
    AGENT_START = "agent_start"
    AGENT_COMPLETE = "agent_complete"
    AGENT_FAILED = "agent_failed"
    FINDING = "finding"
    DISCUSSION_MESSAGE = "discussion_message"
    CONSENSUS_START = "consensus_start"
    CONSENSUS_COMPLETE = "consensus_complete"
    ANALYSIS_COMPLETE = "analysis_complete"
    ANALYSIS_FAILED = "analysis_failed"
    ERROR = "error"


# ──────────────────────────────────────────────
# File / Repo Context
# ──────────────────────────────────────────────

class FileEntry(BaseModel):
    path: str
    size: int
    language: str | None = None


class FileContent(BaseModel):
    path: str
    content: str
    language: str | None = None


class ASTSummary(BaseModel):
    functions: list[str] = Field(default_factory=list)
    classes: list[str] = Field(default_factory=list)
    imports: list[str] = Field(default_factory=list)
    routes: list[str] = Field(default_factory=list)


class StaticAnalysisOutput(BaseModel):
    bandit_findings: list[dict] = Field(default_factory=list)
    semgrep_findings: list[dict] = Field(default_factory=list)


class AnalysisContext(BaseModel):
    repo_url: str
    repo_name: str
    primary_language: str = "unknown"
    file_tree: list[FileEntry] = Field(default_factory=list)
    file_contents: list[FileContent] = Field(default_factory=list)
    static_analysis: StaticAnalysisOutput = Field(default_factory=StaticAnalysisOutput)
    ast_summary: ASTSummary = Field(default_factory=ASTSummary)
    project_description: str = ""
    other_agent_summaries: list[AgentSummary] = Field(default_factory=list)


# ──────────────────────────────────────────────
# Agent Output
# ──────────────────────────────────────────────

class Finding(BaseModel):
    id: str
    severity: Severity
    category: str
    file_path: str
    line_number: int | None = None
    description: str
    recommendation: str
    confidence: int = Field(ge=0, le=100)
    source: str = "llm_inferred"
    verified: bool = False
    veto_active: bool = False


class AgentSummary(BaseModel):
    agent_name: str
    summary: str
    top_priority: str
    finding_count: int = 0


class AgentOutput(BaseModel):
    agent_name: str
    status: Literal["complete", "partial", "failed"] = "complete"
    findings: list[Finding] = Field(default_factory=list)
    summary: str = ""
    top_priority: str = ""


# ──────────────────────────────────────────────
# Discussion Phase
# ──────────────────────────────────────────────

class DiscussionTurn(BaseModel):
    round_number: int
    agent_name: str
    turn_type: TurnType
    target_agent: str | None = None
    target_finding_id: str | None = None
    message: str
    confidence: int | None = None


class Conflict(BaseModel):
    finding_ids: list[str]
    agent_a: str
    agent_b: str
    description: str


# ──────────────────────────────────────────────
# Consensus Report
# ──────────────────────────────────────────────

class ActionItem(BaseModel):
    priority: int
    finding_ids: list[str]
    title: str
    effort: Literal["< 1 hour", "< 1 day", "< 1 week", "> 1 week"]
    assignable_to: str = "any developer"


class ConflictResolution(BaseModel):
    agent_a: str
    agent_b: str
    finding_ids: list[str]
    winner: str
    reason: str


class ConsensusReport(BaseModel):
    executive_summary: str = ""
    findings: list[Finding] = Field(default_factory=list)
    action_plan: list[ActionItem] = Field(default_factory=list)
    conflicts_resolved: list[ConflictResolution] = Field(default_factory=list)
    agents_that_participated: list[str] = Field(default_factory=list)
    agents_that_failed: list[str] = Field(default_factory=list)


# ──────────────────────────────────────────────
# SSE Events
# ──────────────────────────────────────────────

class AgentEvent(BaseModel):
    event_type: EventType
    agent_name: str | None = None
    data: dict = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ──────────────────────────────────────────────
# API Request / Response
# ──────────────────────────────────────────────

class AnalysisRequest(BaseModel):
    repo_url: str = Field(..., description="GitHub repository URL")


class AnalysisResponse(BaseModel):
    analysis_id: str
    status: AnalysisStatus = AnalysisStatus.PENDING
    repo_url: str


class AnalysisDetail(BaseModel):
    analysis_id: str
    status: AnalysisStatus
    repo_url: str
    repo_name: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    agent_outputs: list[AgentOutput] = Field(default_factory=list)
    discussion_turns: list[DiscussionTurn] = Field(default_factory=list)
    consensus_report: ConsensusReport | None = None


class UserResponse(BaseModel):
    id: str
    username: str
    email: str | None = None
    github_id: str


class AuthCallbackRequest(BaseModel):
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Forward reference update
AnalysisContext.model_rebuild()
