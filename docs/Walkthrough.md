# DevCouncil AI — Implementation Walkthrough

## What Was Built

A full-stack multi-agent AI code review platform with:

### Backend ([backend/](file:///h:/Code/Fun%20Projects/DevCouncil/backend))

| Component | File | Purpose |
|-----------|------|---------|
| FastAPI App | [main.py](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/main.py) | CORS, routers, lifespan DB init |
| Config | [config.py](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/config.py) | Pydantic settings from `.env` |
| Schemas | [schemas.py](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/models/schemas.py) | 25+ Pydantic models for API types |
| DB Models | [db.py](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/models/db.py) | 6 SQLAlchemy tables (async) |
| Analysis Router | [analysis.py](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/routers/analysis.py) | POST, GET, SSE stream endpoints |
| Auth Router | [auth.py](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/routers/auth.py) | GitHub OAuth + JWT + guest mode |
| Reports Router | [reports.py](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/routers/reports.py) | Analysis history listing |
| Ingestion | [ingestion.py](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/services/ingestion.py) | GitHub API file fetching + regex AST |
| Orchestrator | [orchestrator.py](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/services/orchestrator.py) | 3-phase pipeline with SSE events |
| Cache | [cache.py](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/services/cache.py) | Redis + in-memory fallback |

### AI Agents ([backend/app/agents/](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/agents))

| Agent | System Prompt Focus | Special Features |
|-------|-------------------|------------------|
| [BaseAgent](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/agents/base.py) | — | Groq JSON mode, retry, timeout |
| [Architect](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/agents/architect.py) | Coupling, scalability, API design | Cross-agent challenge capability |
| [Security](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/agents/security.py) | OWASP Top 10, hardcoded secrets | `veto_active` on CRITICAL findings |
| [Code Reviewer](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/agents/code_reviewer.py) | Code smells, error handling, perf | Function-level citations |
| [Consensus Director](file:///h:/Code/Fun%20Projects/DevCouncil/backend/app/agents/consensus_director.py) | Conflict resolution, dedup, action plan | Deterministic fallback if LLM fails |

### Frontend ([frontend/](file:///h:/Code/Fun%20Projects/DevCouncil/frontend))

| Component | File | Purpose |
|-----------|------|---------|
| Design System | [globals.css](file:///h:/Code/Fun%20Projects/DevCouncil/frontend/app/globals.css) | Dark mode, glassmorphism, 10+ animations |
| Landing Page | [page.tsx](file:///h:/Code/Fun%20Projects/DevCouncil/frontend/app/page.tsx) | Hero, repo input, agent cards, how-it-works |
| Analysis Page | [analyze/[id]/page.tsx](file:///h:/Code/Fun%20Projects/DevCouncil/frontend/app/analyze/%5Bid%5D/page.tsx) | Tabbed: Discussion Room + Report |
| Discussion Room | [DiscussionRoom.tsx](file:///h:/Code/Fun%20Projects/DevCouncil/frontend/app/components/DiscussionRoom.tsx) | SSE consumer, live status, auto-scroll |
| Agent Message | [AgentMessage.tsx](file:///h:/Code/Fun%20Projects/DevCouncil/frontend/app/components/AgentMessage.tsx) | Color-coded avatars, turn badges |
| Consensus Report | [ConsensusReport.tsx](file:///h:/Code/Fun%20Projects/DevCouncil/frontend/app/components/ConsensusReport.tsx) | Severity groups, action plan, conflicts |
| Finding Card | [FindingCard.tsx](file:///h:/Code/Fun%20Projects/DevCouncil/frontend/app/components/FindingCard.tsx) | Severity badge, file path, confidence bar |
| Types | [types.ts](file:///h:/Code/Fun%20Projects/DevCouncil/frontend/app/lib/types.ts) | Full TypeScript schema + UI metadata |
| API Client | [api.ts](file:///h:/Code/Fun%20Projects/DevCouncil/frontend/app/lib/api.ts) | Typed fetch wrappers |
| SSE Client | [sse.ts](file:///h:/Code/Fun%20Projects/DevCouncil/frontend/app/lib/sse.ts) | EventSource with auto-reconnection |

---

## Architecture Decisions

- **Skipped Tree-Sitter/Bandit/Semgrep** — used regex-based AST extraction and LLM-only analysis for faster development. The agents analyze code directly from file contents.
- **SQLite for local dev** — async via `aiosqlite`, swappable to Neon PostgreSQL for production.
- **In-memory SSE queues** — `asyncio.Queue` per analysis, no external message broker needed for MVP.
- **Discussion phase optimized** — runs 1 round instead of 3 to save API cost and time.
- **Deterministic consensus fallback** — if the Consensus Director LLM call fails, findings are merged and sorted by severity automatically.

## Verification Results

- ✅ Backend starts and serves `GET /health` → `{"status": "healthy"}`
- ✅ Database auto-creates all 6 tables on startup
- ✅ Frontend builds with zero TypeScript errors
- ✅ All routes correctly registered (`/api/analysis`, `/api/auth`, `/api/reports`)

## How to Run

```bash
# Terminal 1: Backend
cd backend
cp .env.example .env   # Fill in your GROQ_API_KEY
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

Then open http://localhost:3000 and paste a GitHub URL.
