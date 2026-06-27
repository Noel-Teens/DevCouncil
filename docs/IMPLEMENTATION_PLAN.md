# IMPLEMENTATION_PLAN.md
# DevCouncil AI — Execution Roadmap

---

## Development Timeline

Total: 15 days. Build sequence is backend-first because the frontend has nothing to display until the analysis pipeline works. The Discussion Room UI is the highest-risk frontend component and gets a dedicated day.

---

## Phase 1 — Foundation (Days 1–3)

**Objectives**: Working project skeleton, database up, GitHub OAuth working, repo ingestion returning file tree.

**Tasks**:
- Initialize Next.js 14 project (App Router, TypeScript, Tailwind, ShadCN)
- Initialize FastAPI project (Python 3.11, async, Pydantic v2)
- Configure Neon PostgreSQL + run initial Alembic migration (all 6 tables)
- Configure Upstash Redis client
- Implement GitHub OAuth via NextAuth.js (frontend) + `/auth/github/callback` (backend)
- Implement JWT issue + validation middleware
- Implement repo ingestion service: fetch GitHub file tree via API, pull file contents for files < 200KB
- Write unit tests for ingestion (mock GitHub API responses)

**Dependencies**: Neon DB must be provisioned before DB code can be written. GitHub OAuth app must be registered before auth can be tested.

**Estimated Effort**: 3 developer-days

**Deliverables**:
- Repo URL → file tree + contents JSON (tested, no UI yet)
- GitHub OAuth login flow working end-to-end
- Database schema created and migrated

---

## Phase 2 — Static Analysis Pipeline (Days 4–5)

**Objectives**: Bandit + Semgrep + Tree-Sitter all producing structured JSON from a test repository.

**Tasks**:
- Install and configure Bandit as a Python subprocess call
- Install and configure Semgrep with default rulesets (p/default, p/owasp-top-ten)
- Install Tree-Sitter Python bindings + grammars for Python and JavaScript
- Write `static_analysis.py`: takes file list → returns structured findings JSON
- Write `AnalysisContext` builder: merges file tree, static analysis output, AST parse output into one object
- Validate output against Pydantic schemas
- Test against DVWA (Damn Vulnerable Web Application) — should find 5+ known vulnerabilities

**Dependencies**: Phase 1 ingestion complete (needs file contents to analyze).

**Estimated Effort**: 2 developer-days

**Deliverables**:
- `POST /analysis` creates analysis record + triggers background analysis task
- Static analysis pipeline runs successfully on a Python repo and a JavaScript repo
- Bandit findings correctly parsed to `{file, line, rule_id, severity, message}` schema

---

## Phase 3 — AI Agent Core (Days 6–9)

**Objectives**: Architect, Security, and Code Reviewer agents running in parallel and producing structured findings. Consensus Director producing a valid unified report. SSE stream emitting events.

**Tasks**:
- Implement `BaseAgent` class: `call_llm()`, `parse_output()`, `retry()`, timeout handling
- Implement Groq API client wrapper with rate limit handling
- Write system prompts for: Architect Agent, Security Agent, Code Reviewer Agent
- Write input context builders for each agent (truncate file contents to fit context window)
- Implement `orchestrator.py`: `asyncio.gather` for parallel agent calls
- Implement SSE event queue (asyncio Queue per analysis_id)
- Implement `/analysis/{id}/stream` endpoint using `sse-starlette`
- Write Discussion Phase logic: sequential round-robin, 3 rounds max
- Write Consensus Director agent: system prompt, conflict resolution, report assembly
- End-to-end test: submit test repo → SSE stream fires → consensus report generated → stored in DB

**Dependencies**: Phase 2 static analysis output feeds into agent context builders.

**Estimated Effort**: 4 developer-days (highest complexity phase)

**Deliverables**:
- All 3 must-build agents execute and produce valid JSON findings
- Discussion phase produces at least one challenge event between agents
- Consensus Director produces a report with all required fields
- SSE stream delivers events in correct order
- All findings include file path and at least 80% include line numbers

---

## Phase 4 — UI & UX (Days 10–12)

**Objectives**: A clean, demo-ready UI. Judge can understand the product in 30 seconds. Discussion Room looks impressive.

**Tasks**:
- Build landing page: hero text, repo URL input, "Analyze" button, feature list
- Build analysis submission flow: POST to backend, receive analysis_id, redirect to /analyze/[id]
- Build Discussion Room component: SSE consumer, renders agent messages as they arrive, animated appearance for each message
- Build agent message bubble: agent avatar (colored icon), agent name, message type badge (Finding / Challenge / Agreement), confidence percentage, message text
- Build Consensus Report renderer: findings grouped by severity, severity badge, file path link, line number, recommendation text
- Build conflict resolution section: "Security Agent overruled Architect Agent — reason: expanded attack surface"
- Build dashboard: list of past analyses, status, repo name, timestamp
- Implement loading states: skeleton loaders while analysis runs, progress indicator showing "Analyzing with 3 agents..."
- Mobile-responsive layout (judges may use laptops, still needs to look clean)

**Dependencies**: Phase 3 SSE stream and API endpoints must be complete.

**Estimated Effort**: 3 developer-days

**Deliverables**:
- Full user flow working: paste URL → watch Discussion Room → read report
- UI renders correctly on Chrome and Firefox
- No unstyled elements or layout breaks in core flow

---

## Phase 5 — Testing & Hardening (Days 13–14)

**Objectives**: No crashes during demo. Edge cases handled gracefully.

**Tasks**:
- Test against 5 different real GitHub repositories (Python, JS, mixed)
- Test error states: private repo, repo too large, Groq rate limit hit, agent timeout
- Test SSE reconnection: close and reopen browser tab mid-analysis
- Test concurrent analyses (run 2 simultaneously)
- Add missing error messages to frontend (currently shows raw errors)
- Fix top 3–5 bugs found during testing
- Write demo script and pre-cache demo repository result
- Smoke test deployed Vercel + Render environments end-to-end
- Add loading/empty states for dashboard (first-time user, no analyses yet)

**Estimated Effort**: 2 developer-days

**Deliverables**:
- Zero crashes on any of the 5 test repositories
- All error states show user-facing messages (no JSON stack traces visible)
- Demo cache pre-loaded and verified

---

## Phase 6 — Demo Preparation (Day 15)

**Objectives**: Demo works perfectly. Team knows the script. Backup plan in place.

**Tasks**:
- Pre-cache the two demo repository analyses (the "disagreement" scenario and the "hardcoded secret" scenario)
- Record a 3-minute screen recording as backup in case live demo fails
- Rehearse demo script 3 times with full team
- Prepare answer to "why not just use ChatGPT?" with the side-by-side comparison pre-loaded
- Final deployment verification: check Render hasn't gone to sleep (ping endpoint)
- Set up demo laptop with browser tabs pre-opened at correct URLs

**Deliverables**:
- Live demo runs in 3 minutes without errors
- Backup screen recording available
- Team can answer top 5 judge questions without hesitation

---

## Daily Breakdown

**Day 1**
- Tasks: Initialize both projects (Next.js + FastAPI). Configure Neon DB + Alembic. Create all DB tables. Register GitHub OAuth app.
- Expected output: Both projects run locally. DB connected. OAuth app registered with client_id + secret.
- Completion criteria: `GET /health` returns 200. Alembic migration runs without error.

**Day 2**
- Tasks: Implement GitHub OAuth end-to-end. JWT issue and validation. Basic protected route.
- Expected output: User can log in with GitHub. JWT stored in httponly cookie. `/me` endpoint returns user data.
- Completion criteria: Full OAuth round-trip works. Invalid JWT returns 401.

**Day 3**
- Tasks: Implement repo ingestion service. GitHub API client. File tree fetcher. File content extractor with 200KB limit.
- Expected output: Given a GitHub URL, backend returns structured file list with contents.
- Completion criteria: `ingestion.py` processes `github.com/tiangolo/fastapi` and returns file tree in < 8 seconds.

**Day 4**
- Tasks: Integrate Bandit. Subprocess runner. Output parser to structured JSON schema.
- Expected output: Bandit runs on ingested Python files and returns structured findings.
- Completion criteria: Running against DVWA Python files returns at least 5 MEDIUM/HIGH findings.

**Day 5**
- Tasks: Integrate Semgrep. Integrate Tree-Sitter. Build `AnalysisContext` object that merges all three.
- Expected output: `AnalysisContext` object populated with file tree + static analysis + AST data.
- Completion criteria: `AnalysisContext` validates against Pydantic schema for both a Python repo and a JS repo.

**Day 6**
- Tasks: Implement `BaseAgent` class. Implement Groq API client. Write Architect Agent system prompt and input builder.
- Expected output: Architect Agent runs against a test repo and returns JSON findings.
- Completion criteria: Architect Agent returns at least 3 findings with file paths. JSON validates against `AgentOutput` schema.

**Day 7**
- Tasks: Write Security Agent system prompt and input builder. Verify it uses Bandit/Semgrep output (not hallucinated findings).
- Expected output: Security Agent produces findings grounded in static analysis output.
- Completion criteria: Every Security Agent finding references a finding from Bandit or Semgrep output.

**Day 8**
- Tasks: Write Code Reviewer Agent. Implement `asyncio.gather` orchestrator. Run all 3 agents in parallel. Implement SSE event queue and `/stream` endpoint.
- Expected output: All 3 agents run in parallel. Results arrive in ~20 seconds. SSE stream fires events.
- Completion criteria: `curl /analysis/{id}/stream` receives events from all 3 agents within 30 seconds.

**Day 9**
- Tasks: Implement Discussion Phase (3 rounds). Implement Consensus Director. End-to-end pipeline test.
- Expected output: Full pipeline runs: ingest → analyze → discuss → consensus → DB write.
- Completion criteria: Submitted test repo produces a consensus report in DB with findings, action plan, and at least 1 conflict resolved.

**Day 10**
- Tasks: Build landing page. Build repo URL input + submission flow. Build `/analyze/[id]` page skeleton.
- Expected output: User can submit a repo URL from the browser and receive an analysis_id.
- Completion criteria: Full round-trip from browser URL paste to `/analyze/[id]` page loading.

**Day 11**
- Tasks: Build Discussion Room SSE consumer. Render agent messages as they arrive. Animated appearance per message.
- Expected output: Discussion Room renders live agent conversation.
- Completion criteria: Refreshing the page mid-analysis reconnects and shows all messages received so far + new ones.

**Day 12**
- Tasks: Build Consensus Report UI. Severity grouping. FindingCard components. Conflict resolution section. Dashboard.
- Expected output: Complete post-analysis UI renders all report sections.
- Completion criteria: Report renders for the full 7-section consensus report without layout breaks.

**Day 13**
- Tasks: Test against 5 different repos. Fix critical bugs. Add error states to frontend.
- Expected output: All 5 repos complete without crashes.
- Completion criteria: Zero uncaught exceptions in backend logs for any of the 5 repos.

**Day 14**
- Tasks: Performance testing. SSE reconnection testing. Concurrent analysis testing. Pre-cache demo results.
- Expected output: Demo repos cached. All edge cases handled.
- Completion criteria: Demo runs end-to-end from cached data in under 5 seconds (excluding live analysis).

**Day 15**
- Tasks: Demo rehearsal x3. Backup recording. Deploy verification.
- Expected output: Team is ready to demo without reading notes.
- Completion criteria: 3-minute demo runs without hesitation or error.

---

## Team Allocation

### Solo Developer
- Days 1–5: Backend only (ingestion, static analysis). Do not touch frontend.
- Days 6–9: Agents only. Skip PM/QA/Doc agents entirely.
- Days 10–12: Build frontend UI. Use pre-built ShadCN components for speed.
- Days 13–15: Testing, demo prep. Cut should-have features entirely.
- MVP cut: 3 agents only (Architect, Security, Code Reviewer) + Consensus Director.

### 2 Developers
- Developer A owns: backend (ingestion, static analysis, orchestrator, agents, DB)
- Developer B owns: frontend (Next.js, all UI components, SSE consumer)
- Sync checkpoint: End of Day 5. Developer B can start building UI against mock API responses.
- Integration checkpoint: End of Day 9. Both connect and test end-to-end.
- Days 10–12: Developer A adds PM/QA agents. Developer B polishes UI.
- Days 13–15: Both on testing and bug fixes.

### 3 Developers
- Developer A: Backend infrastructure (FastAPI, DB, auth, ingestion, static analysis)
- Developer B: AI orchestration (agent system prompts, orchestrator, discussion phase, consensus)
- Developer C: Frontend (all UI, SSE consumer, report renderer)
- Developer A finishes by Day 5, then moves to DevOps (Docker, Render, deployment CI).
- Developer B works Days 4–10. Discussion phase is the highest-risk component.
- Developer C can start UI on Day 3 with mock data.

### 5 Developers
- Developer A: Infrastructure, auth, DB, deployment
- Developer B: Repo ingestion + static analysis pipeline
- Developer C: AI agents + orchestrator
- Developer D: Frontend core (landing, Discussion Room, Report)
- Developer E: Frontend polish + testing + demo prep
- All agents can be built simultaneously (Days 6–8) by splitting: C builds Architect + Consensus, B builds Security + Code Reviewer after finishing ingestion.
- Developer E starts building the demo script and backup recording on Day 12.

---

## Critical Path

The critical path is: **Ingestion → Static Analysis → Agents → Consensus → SSE Stream → Discussion Room UI**

Each step depends on the previous. No stage can be parallelized with its predecessor.

**Blockers**:
- Groq API key must be obtained before Day 6. Apply for free tier immediately on Day 1.
- Neon DB must be provisioned on Day 1. Schema migrations must not break existing data.
- Render Docker deployment must be tested by Day 9. Bandit + Semgrep may need system dependencies (install in Dockerfile on Day 1).

**High-Risk Components**:
1. **Discussion Phase** (Day 9): Agent-to-agent communication requires prompt engineering. Budget 2× the expected time. Fallback: skip discussion phase, go straight from parallel analysis to consensus.
2. **SSE Streaming on Render** (Day 8): Long-running connections can be dropped. Test with `curl --no-buffer` early.
3. **Tree-Sitter WASM in Python** (Day 5): Grammar file installation can fail. Test in Docker container, not local environment.
4. **Groq Rate Limits** (Day 8): 7 parallel calls may hit the per-minute limit. Test with 3 agents first.

---

## MVP Cut Strategy

**If time runs out on Day 12 (3 days remaining)**:
- Cut PM Agent, QA Agent, Documentation Agent
- Cut PR review analysis flow
- Cut confidence score display
- Keep: 3 agents + consensus, Discussion Room, basic report UI

**If time runs out on Day 13 (2 days remaining)**:
- Cut Discussion Phase (skip to direct consensus after parallel analysis)
- Pre-populate all demo data from hardcoded JSON (no live API calls during demo)
- Keep: report UI, severity grouping, file path citations

**Must Never Remove**:
- Architect Agent, Security Agent, Code Reviewer Agent (3 agents minimum for demonstrable disagreement)
- Consensus Director (no consensus = no demo)
- SSE-streamed Discussion Room (this is the WOW moment — if it doesn't stream, the product is boring)
- File path + line number citations (without these, agents are just ChatGPT with roles)
- Security Agent veto mechanic (this is what differentiates from single-model AI)
- Pre-cached demo results (never run a live analysis during the demo presentation)
