# DevCouncil AI — Task Tracker

## Phase 1: Backend Foundation
- [x] Create FastAPI project structure
- [x] Create .env.example with all required secrets
- [x] Define Pydantic schemas (all request/response types)
- [x] Define SQLAlchemy models (6 tables)
- [x] Database setup + initialization
- [x] Create routers: analysis, auth, reports
- [x] SSE streaming endpoint
- [x] Health check endpoint
- [x] requirements.txt + install

## Phase 2: Repository Ingestion
- [x] GitHub API client (fetch file tree + contents)
- [x] File filtering (size limits, binary skip)
- [x] Language detection
- [x] AnalysisContext builder
- [x] Regex-based AST extraction (lightweight alternative to Tree-Sitter)

## Phase 3: AI Agent Core
- [x] BaseAgent class (call_llm, parse, retry, timeout)
- [x] Groq API client wrapper (JSON mode)
- [x] Architect Agent (system prompt + input builder)
- [x] Security Agent (system prompt + veto mechanic)
- [x] Code Reviewer Agent (system prompt)
- [x] Consensus Director Agent (LLM + deterministic fallback)
- [x] Orchestrator (asyncio.gather + discussion + consensus)
- [x] SSE event emission per agent message
- [x] Redis cache service with in-memory fallback

## Phase 4: Frontend UI
- [x] Design system (globals.css dark mode palette, glassmorphism, animations)
- [x] Root layout + metadata + fonts
- [x] Landing page (hero, repo input, features, how-it-works)
- [x] TypeScript types (lib/types.ts)
- [x] API client (lib/api.ts)
- [x] SSE wrapper (lib/sse.ts)
- [x] RepoInput component
- [x] DiscussionRoom component (SSE consumer)
- [x] AgentMessage component
- [x] ConsensusReport component
- [x] FindingCard component
- [x] SeverityBadge component
- [x] ConflictResolution component
- [x] Analysis page (/analyze/[id])
- [x] .env.local for frontend

## Verification
- [x] Backend starts and serves health endpoint
- [x] Frontend builds with zero TypeScript errors
- [x] Database auto-creates on startup
