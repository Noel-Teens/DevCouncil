<div align="center">

<img src="./logo.svg" alt="DevCouncil AI — Multi-Agent Virtual Engineering Team" width="100%"/>

### Your entire senior engineering team — powered by collaborative AI.

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Groq](https://img.shields.io/badge/LLM-Groq%20%2B%20Llama%203.3-FF6B35)](https://groq.com)
[![PostgreSQL](https://img.shields.io/badge/DB-Neon%20PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://neon.tech)
[![Deploy](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://vercel.com)
[![Deploy](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://render.com)

<br/>

<!-- **[Live Demo](https://devcouncil.ai)** · **[Watch 3-Min Demo Video](#)** · **[Read the Docs](#documentation)** -->
<br/>

</div>

---

## The Problem We're Solving

Every production codebase needs eyes from at least six different experts:

| Domain | Without Expert Access |
|---|---|
| 🏗️ Architecture | 40% of dev time lost to technical debt |
| 🔐 Security | 60% of breaches come from known, preventable flaws |
| 🧪 QA | 80% of bugs are caught in production, not development |
| 📝 Documentation | $50K+ lost per project in onboarding and handovers |
| 📋 Product | 1 in 3 built features are never used |
| 🔍 Code Quality | 15–50% overhead added by poor code across a project's lifetime |

**31 million solo developers and small teams** build most of the world's software without access to even one of these specialists.

Current AI tools — Copilot, Cursor, ChatGPT — give you **one model's opinion**. A single model cannot disagree with itself. It cannot catch that the architecture it just recommended triples your attack surface — because that requires a Security Engineer pushing back on an Architect in real time.

---

## What DevCouncil AI Does

DevCouncil AI runs **three specialist AI agents plus a Consensus Director** against your GitHub repository. Each specialist independently analyzes your code from its own domain. Then they **debate**, and the Director arbitrates.

```
You paste a GitHub URL.

Architect Agent ──────────────────────────────► "Migrate to microservices — clear domain boundaries."
                                                  confidence: 78%
Security Agent ───────────────────────────────► "Microservices triple the attack surface.
                                                  JWT between services = 4 new vuln classes."
                                                  confidence: 91%

                    ⚡ CONFLICT DETECTED

Consensus Director ───────────────────────────► "Modular monolith adopted. Security concern
                                                  overrides architecture preference at current scale."

You get a report. The debate is transparent. The decision is explained.
```

**This is what a real senior engineering team does. We built it for under $0.05 per analysis.**

---

## The Council

Three specialists debate; the Director arbitrates. Each runs in its own context with its own system prompt, so they can genuinely disagree.

<table>
<tr>
<td width="50%">

**🏗️ Architect Agent**
System design authority. Owns scalability, design patterns, technology choices, and refactoring priorities. The only agent that can challenge a Security recommendation on proportionality grounds.

**🔐 Security Agent**
Vulnerability authority. Grounds findings in **Bandit** static-analysis output (real scanner, Python) plus direct code review. Has **veto power** — CRITICAL findings cannot be removed from the final report by any other agent.

</td>
<td width="50%">

**🔍 Code Reviewer Agent**
Code quality authority. Provides line-level citations for every recommendation. Never gives generic advice — "fix line 47 in `payment.py`", not "improve error handling".

**⚖️ Consensus Director Agent**
Synthesis authority. Collects all findings, resolves conflicts using explicit priority rules, and explains every decision. Does not average disagreements — it arbitrates them.

</td>
</tr>
</table>

**On the roadmap:** Product Manager (spec-vs-code gaps), QA Tester (executable test generation), and Documentation agents. The architecture is designed to add specialists without touching the orchestrator — these are the next three.

---

## The Discussion Room

The highest-impact feature is watching it happen in real time.

```
┌─────────────────────────────────────────────────────────────────┐
│  🔴 LIVE DevCouncil AI — Discussion Room                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🏗️  Architect Agent  [confidence: 78%]              FINDING    │
│  ─────────────────────────────────────────────────────────────  │
│  Recommend decomposing UserService into two bounded             │
│  contexts. File: src/services/users.py shows clear              │
│  domain boundary at line 234.                                   │
│                                                                 │
│  🔐  Security Agent  [confidence: 91%]            CHALLENGE ⚡ │
│  ─────────────────────────────────────────────────────────────  │
│  Challenging architect_3. Decomposition introduces JWT          │
│  inter-service auth — 4 new attack vectors not present in       │
│  current stack. Inter-service JWT auth confirmed as risk        │
│  risk in: src/middleware/auth.py:18                             │
│                                                                 │
│  🏗️  Architect Agent  [confidence: 62%]              CONCEDE  ✓│
│  ─────────────────────────────────────────────────────────────  │
│  Security concern is valid at current scale. Withdrawing        │
│  microservices recommendation. Modular monolith preferred.      │
│                                                                 │
│  ⚖️  Consensus Director                         RESOLUTION  ✅ │
│  ─────────────────────────────────────────────────────────────  │
│  Modular monolith adopted. Security Agent's concern             │
│  overrides architectural preference — attack surface            │
│  expansion is disproportionate to the benefit at <1000          │
│  users. Architect Agent conceded in round 2.                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Every message streams in real time via Server-Sent Events. Every conflict is explained. Every confidence score is visible.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                │
│              Next.js 14 · TypeScript · Tailwind · ShadCN            │
│                    SSE Consumer · Report Renderer                   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ REST + SSE
┌───────────────────────────▼─────────────────────────────────────────┐
│                       FASTAPI BACKEND                               │
│                    (Render · Docker · Python 3.11)                  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────┐   │
│  │  Ingestion  │  │ Static Anal. │  │    AI Orchestrator        │   │
│  │  GitHub API │  │ Bandit       │  │  3 specialists (staggered │   │
│  │  File Tree  │  │ (regex AST)  │  │  for free-tier TPM)       │   │
│  │  Content    │  │              │  │  Debate → Consensus       │   │
│  └─────────────┘  └──────────────┘  └───────────────────────────┘   │
└───────────┬───────────────┬──────────────────────┬──────────────────┘
            │               │                      │
    ┌───────▼──────┐ ┌──────▼──────┐      ┌───────▼────────┐
    │   SQLite     │ │   Upstash   │      │   Groq API     │
    │ (Postgres-   │ │    Redis    │      │ Llama-3.3-70b  │
    │   ready, 6   │ │ (optional;  │      │ (3 specialists │
    │   tables)    │ │ in-mem      │      │  + director)   │
    │              │ │ fallback)   │      │                │
    └──────────────┘ └─────────────┘      └────────────────┘
```

### Technology Decisions

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Native SSE streaming support; TypeScript for agent message type safety |
| Backend | FastAPI + Python | Native async for SSE streaming; mature static-analysis tooling (Bandit) |
| LLM | Groq + Llama-3.3-70b | Fastest inference on free tier (~500 tok/s); full analysis under $0.05 |
| Orchestration | `asyncio` (staggered) | Agents are staggered rather than fully parallel to respect Groq's free-tier TPM limit; direct async is sufficient for MVP |
| Database | SQLite (Postgres-ready) | Zero-config local persistence via SQLAlchemy async; swap `DATABASE_URL` for Neon Postgres in production |
| Cache | Upstash Redis (optional) | Response caching + rate limiting; falls back to in-memory when unset |
| Auth | GitHub OAuth + JWT + guest | Single-click login for devs; guest mode for a zero-signup demo |
| Static Analysis | Bandit | Grounds Security findings in real scanner detections (Python) — prevents LLM hallucination. Semgrep (multi-language) is on the roadmap |
| AST | Regex extraction | Lightweight file-path + line-number citations. Tree-Sitter is on the roadmap |
| Deploy | Vercel + Render | Both free tier; Render supports persistent processes for SSE streaming |

---

## Hallucination Mitigation

This is the engineering decision that separates DevCouncil AI from "ChatGPT with agent names".

Every finding must be grounded in a concrete artifact:

```python
# Security findings are grounded in Bandit static-analysis output.
# A finding whose file+line matches a Bandit result is marked verified=true
# by the orchestrator (deterministically — not on the LLM's say-so).

class SecurityFinding(BaseModel):
    file_path: str        # required — no file path = no finding
    line_number: int      # required for code-level claims
    source: Literal["bandit", "semgrep", "ast", "llm_inferred"]
    verified: bool        # True only if grounded in static analysis output
    confidence: int       # below 60 = excluded from output

# Any recommendation without a source citation is automatically flagged
# as 'unverified' and deprioritized in the consensus report.
```

The Consensus Director cross-references every finding against source artifacts before including it in the final report.

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Groq API key (free at [console.groq.com](https://console.groq.com)) — required only for live analysis, not the demo
- GitHub OAuth app credentials (optional — guest mode works without them)

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/devcouncil-ai.git
cd devcouncil-ai
```

### 2. Backend Setup

```bash
cd backend

# Install Python dependencies (includes Bandit for static analysis)
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env.local
```

Edit `.env.local` (only `GROQ_API_KEY` is required for live analysis — the
demo scenarios run without it):
```env
GROQ_API_KEY=gsk_...                    # Groq API key (required for live runs)
DATABASE_URL=sqlite+aiosqlite:///./devcouncil.db   # default; swap for Neon Postgres in prod
JWT_SECRET=<a long random string>       # e.g. `python -c "import secrets;print(secrets.token_urlsafe(48))"`
GITHUB_CLIENT_ID=...                    # optional — guest mode works without OAuth
GITHUB_CLIENT_SECRET=...
GITHUB_TOKEN=...                        # optional PAT — raises GitHub ingestion rate limit
UPSTASH_REDIS_URL=                      # optional — falls back to in-memory
FRONTEND_URL=http://localhost:3000
```

```bash
# Tables are created automatically on startup (SQLAlchemy) — no migration step.
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_GITHUB_CLIENT_ID=...        # optional — only needed for GitHub OAuth login
```

```bash
# Start the frontend
npm run dev
```

Visit `http://localhost:3000`. Paste any public GitHub URL — or click **Watch a demo** to see the council convene instantly with no signup.

### 4. Try the demo (no setup)

With both servers running, open `http://localhost:3000` and click **The Disagreement**
or **The Hardcoded Secret**. These replay a canned analysis through the live SSE
stream — no Groq key, no GitHub token, guaranteed to work offline. Perfect for a
reliable demo.

> **Roadmap:** a Dockerfile and Neon Postgres deployment (Render) are planned but not
> required for local development.

---

## Project Structure

```
devcouncil-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry point
│   │   ├── config.py                # Configuration settings
│   │   ├── routers/
│   │   │   ├── auth.py              # GitHub OAuth + JWT
│   │   │   ├── analysis.py          # POST /analysis, GET /stream
│   │   │   └── reports.py           # Report history
│   │   ├── services/
│   │   │   ├── ingestion.py         # GitHub API client + file extraction
│   │   │   ├── orchestrator.py      # staggered async agents + debate + consensus
│   │   │   └── cache.py             # Caching service
│   │   ├── agents/
│   │   │   ├── base.py              # BaseAgent: call_llm, parse, retry
│   │   │   ├── architect.py
│   │   │   ├── security.py
│   │   │   ├── code_reviewer.py
│   │   │   └── consensus_director.py
│   │   └── models/
│   │       ├── db.py                # SQLAlchemy models
│   │       └── schemas.py           # Pydantic request/response schemas
│   ├── devcouncil.db                # SQLite database
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── layout.tsx               # Root layout
│   │   ├── globals.css              # Global styles
│   │   ├── analyze/[id]/page.tsx    # Analysis view
│   │   ├── components/
│   │   │   ├── DiscussionRoom.tsx       # SSE consumer, live agent messages
│   │   │   ├── AgentMessage.tsx         # Message bubble (name, confidence, type)
│   │   │   ├── ConsensusReport.tsx      # Final report renderer
│   │   │   ├── FindingCard.tsx          # Severity badge + citation + recommendation
│   │   │   ├── ConflictResolution.tsx   # Conflict resolution presentation
│   │   │   ├── RepoInput.tsx            # Repository URL input component
│   │   │   └── SeverityBadge.tsx        # Severity indicator badge
│   │   └── lib/
│   │       ├── api.ts                   # Backend API client
│   │       ├── sse.ts                   # EventSource with reconnection
│   │       └── types.ts                 # Agent message + finding types
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.local
│
├── docs/
│   ├── PROJECT_REQUIREMENTS.md
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── AI_AGENT_SPECIFICATION.md
│   ├── Implemented_Tasks.md
│   └── Walkthrough.md
│
└── README.md
```

---

## API Reference

### Start an Analysis

```http
POST /analysis
Content-Type: application/json

{
  "repo_url": "https://github.com/owner/repo",
  "project_description": "Optional context for agents"
}
```

```json
{
  "analysis_id": "uuid",
  "status": "pending",
  "estimated_duration_seconds": 45
}
```

### Stream the Discussion Room

```http
GET /analysis/{id}/stream
Accept: text/event-stream
```

```
data: {"type": "agent_finding", "agent": "security", "finding": {...}}

data: {"type": "agent_challenge", "agent": "architect", "targets": "security_1", "message": "..."}

data: {"type": "consensus_ready", "report": {...}}
```

### Get the Final Report

```http
GET /analysis/{id}
Authorization: Bearer <jwt>
```

```json
{
  "analysis_id": "uuid",
  "status": "complete",
  "consensus_report": {
    "executive_summary": "...",
    "findings": [...],
    "action_plan": [...],
    "conflicts_resolved": [...]
  },
  "agents_that_participated": ["architect", "security", "code_reviewer"],
  "cost_usd": 0.041,
  "duration_seconds": 38
}
```

---

## Database Schema

```sql
users              → GitHub OAuth identity, JWT auth
projects           → Unique repos (url, primary_language)
analyses           → Each analysis run (status, cost, duration)
agent_outputs      → One row per agent per analysis (findings JSONB)
discussion_turns   → Full discussion transcript (challenges, agreements)
consensus_reports  → Final unified report (findings, action_plan, conflicts)
```

---

## Cost Architecture

A full analysis runs under $0.05:

| Component | Tokens | Cost |
|---|---|---|
| 3 specialist agents (staggered, Llama-3.3-70b) | ~9,000 | ~$0.006 |
| 3 rounds of structured debate | ~6,000 | ~$0.004 |
| Consensus Director (synthesis) | ~8,000 | ~$0.032 |
| Bandit static analysis (local, no API) | N/A | $0.00 |
| **Total** | **~23,000** | **< $0.05** |

Free tier breakdown:
- Groq: 14,400 requests/day → ~200 full analyses/day before rate limiting
- SQLite (local) / Neon Postgres (prod): thousands of stored analyses
- Upstash: 10,000 commands/day → ~50 commands per analysis

---

## Why Not Just Ask ChatGPT?

This is the question we want you to ask.

Run a test: submit the same repository to ChatGPT with the prompt *"You are an Architect, Security Engineer, Code Reviewer, PM, QA Lead, and Documentation Specialist. Review this code."*

Then run it through DevCouncil AI.

Compare these two outputs:

| | ChatGPT (all roles, one prompt) | DevCouncil AI |
|---|---|---|
| Architecture recommendation | "Consider microservices for scalability" | "Modular monolith recommended — Security Agent vetoed microservices after identifying 4 new JWT attack vectors in the proposed inter-service auth layer" |
| Security findings | "Validate your inputs" | "Hardcoded AWS key at config/settings.py:23 — confirmed by Bandit B105, marked verified. Rotate immediately." |
| Self-disagreement | Not possible | Architect and Security agents explicitly challenged each other in round 2 of discussion |
| Hallucination guard | None | Security findings are cross-checked against Bandit output and marked verified when they match. |
| Source citations | Rarely, and often wrong | Every finding requires file path. Line number required for code-level claims. |

The disagreement is not a UX feature. It is an architectural property. Separate agent contexts, separate system prompts, separate static analysis inputs — that is what produces findings that a single context window cannot.

---

## Competitive Landscape

| Tool | What it does | What it misses |
|---|---|---|
| GitHub Copilot | Code completion, IDE integration | No security, no architecture, no QA, no PM view |
| Cursor AI | Deep code chat | No cross-domain reasoning, no consensus |
| SonarQube | Static analysis | No AI reasoning, no conflict resolution |
| Snyk | Security scanning | Security only; expensive for solo devs |
| Qodo / CodiumAI | PR review | Code quality only; no architecture or product scope |
| **DevCouncil AI** | **All six domains + transparent debate + consensus** | **Nothing at this price point** |

---


## The Team

**TEAM 777** · Built at HACKHAZARDS '26 · June 2025

| Member | GitHub |
|---|---|
| Teenie Rod Joshua B | [@Noel-Teens](https://github.com/Noel-Teens) |
| Sandhiya SL | [@SANDHYA098-afk](https://github.com/SANDHYA098-afk) |
| Mithilesh K | [@mithilesh042006](https://github.com/mithilesh042006) |

---

<div align="center">

**DevCouncil AI** — *Every developer deserves a senior engineering team.*

<br/>

*Powered by Groq · Llama 3.3 · FastAPI · Next.js*

</div>
