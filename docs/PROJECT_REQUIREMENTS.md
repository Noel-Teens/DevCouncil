# PROJECT_REQUIREMENTS.md
# DevCouncil AI — Multi-Agent Virtual Engineering Team

---

## Executive Summary

DevCouncil AI is a web platform that accepts a GitHub repository URL and runs seven specialized AI agents in parallel to analyze the codebase. The agents independently produce findings, then enter a structured discussion phase where they challenge each other's conclusions. A Consensus Director agent collects all positions, resolves conflicts using severity-weighted rules, and outputs a unified report with a prioritized action plan.

The product is targeted at solo developers and small teams who lack access to cross-functional senior engineering expertise. A full 7-agent analysis costs under $0.05 and completes in under 45 seconds.

---

## Problem Statement

Professional software development requires coordinated expertise across at least six domains: architecture, security, code quality, QA, documentation, and product requirements. Most solo developers and small teams lack access to even one senior specialist in these areas.

Current AI coding tools (Copilot, Cursor, ChatGPT) provide a single-model response. A single model cannot produce the productive friction that happens when a Security Engineer pushes back on an Architect's recommendation — because that requires two independent expert contexts in dialogue. The result: solo devs receive generic, single-perspective advice that misses cross-domain conflicts.

---

## Why Existing Solutions Are Insufficient

- **GitHub Copilot / Cursor**: Code completion and chat only. No security analysis, no product alignment, no QA coverage, no cross-domain reasoning.
- **SonarQube**: Strong static analysis but no AI reasoning, no architectural guidance, no PM/QA perspective.
- **Snyk**: Best-in-class security scanning but security-only scope and expensive for individual developers.
- **ChatGPT / Claude (single prompt)**: General capability but a single model asked to "play all roles" cannot self-disagree. There is no mechanism for the Architect persona to be overruled by the Security persona within the same context window.
- **Qodo / CodiumAI**: PR review focus, limited to code quality only.

None of these tools produce the cross-domain conflict resolution that emerges from genuinely independent agent contexts.

---

## Project Vision

Build the first platform where multiple AI agents with distinct system prompts and domain-specific tool access independently analyze a codebase, engage in a structured debate visible to the user, and produce a grounded consensus report — simulating the experience of presenting your code to a senior engineering panel.

---

## Project Goals

1. Accept a GitHub repository URL and parse the codebase into agent-consumable context within 10 seconds.
2. Run at least 3 specialist agents (Architect, Security, Code Reviewer) in parallel, each producing grounded findings with file/line citations.
3. Stream an agent Discussion Room to the frontend in real time using Server-Sent Events.
4. Generate a Consensus Report that resolves inter-agent conflicts using explicit priority rules.
5. Render a clean, color-coded report UI that a judge can understand within 30 seconds of seeing it.

---

## Success Metrics

| Metric | Target |
|---|---|
| Repository ingestion + parse time | < 10 seconds for repos up to 50MB |
| Total analysis wall-clock time | < 45 seconds end-to-end |
| Cost per full 7-agent analysis | < $0.05 |
| Agent findings with source citations | > 90% of all findings include file path |
| False positive rate on security findings | < 20% (Bandit/Semgrep grounded) |
| Demo: time from URL paste to Discussion Room visible | < 15 seconds |
| Consensus report renders without errors | 100% of analyses |

---

## Target Users

**Primary**: Solo developers and 1–5 person startup engineering teams shipping production software without access to senior specialists.

**Secondary**: Bootcamp graduates and CS students who want feedback equivalent to a senior code review before submitting projects.

**Demo target**: Hackathon judges evaluating AI-powered developer tools.

---

## User Personas

**Persona 1 — Solo SaaS Developer**
- Name: Arjun, 28, full-stack developer, building a B2B SaaS product solo
- Problem: Shipped a Node.js API to production last month. No security review was done. A customer reported a data leak two weeks later.
- Need: Automated, expert-level security and architecture feedback before every deploy
- Behavior: Pastes GitHub URLs, wants a report in under a minute, will not read documentation

**Persona 2 — Bootcamp Graduate**
- Name: Mei, 24, completed a 6-month bootcamp, applying for first dev job
- Problem: Her portfolio projects get rejected in technical interviews because reviewers find obvious code quality issues she didn't know to fix
- Need: Senior engineer feedback on her repos before submitting applications
- Behavior: Uses free tier, uploads projects, shares reports with potential employers

**Persona 3 — Hackathon Judge**
- Name: Raj, Staff Engineer at a Series B startup, judging 20 projects in 4 hours
- Need: To immediately understand what DevCouncil AI does, see a live demo that proves the multi-agent value over a single ChatGPT prompt
- Behavior: Will ask "why not just use ChatGPT?" — needs a live demonstration of agent disagreement

---

## Core User Stories

1. As a developer, I can paste a GitHub repository URL and click "Analyze" to start a full code review, so that I don't need to install anything or configure tools.
2. As a developer, I can watch the agent Discussion Room in real time, so that I can see why recommendations were made and which agents disagreed.
3. As a developer, I receive a final consensus report with findings organized by severity (CRITICAL, HIGH, MEDIUM, LOW), so that I know what to fix first.
4. As a developer, every security finding links to the exact file and line number in my code, so that I can navigate directly to the issue.
5. As a developer, I can see confidence scores on every agent recommendation, so that I know how certain the agent is about each finding.
6. As a developer, I can see when agents disagreed and how the conflict was resolved, so that I understand the tradeoffs in the recommendations.

---

## Functional Requirements

### FR-01: Repository Ingestion
- Accept a GitHub URL (public repositories only for MVP)
- Clone the repository or fetch file tree via GitHub API
- Extract file list, directory structure, and file contents for supported languages: Python, JavaScript, TypeScript, Go, Java
- Build a file context object consumable by agents (path, content, language, size)
- File size limit: 50MB total repository size; skip files over 200KB

### FR-02: Static Analysis
- Run Bandit (Python repos) and Semgrep (all supported languages) on ingested code
- Parse output to structured JSON: `{file, line, rule_id, severity, message}`
- Run Tree-Sitter AST parsing on primary language files
- Extract: function names, class names, import list, API route definitions, dependency list

### FR-03: Agent Analysis (Parallel)
- Spin up all specialist agents simultaneously (not sequentially)
- Each agent receives: static analysis output, file tree, selected file contents (truncated to fit context), project description
- Each agent produces structured output: `{findings: [{severity, category, file, line, description, confidence, recommendation}], summary}`
- Agent timeout: 30 seconds; mark as failed if exceeded

### FR-04: Discussion Phase
- Sequential agent turn-based discussion (not truly parallel to avoid API rate limits)
- Each agent can: emit a "challenge" to another agent's specific finding, emit an "agreement", emit a new finding triggered by another agent's output
- Discussion capped at 3 rounds to keep total time under 15 seconds
- Every discussion message streamed to frontend via SSE

### FR-05: Consensus Generation
- Consensus Director collects all agent findings and discussion outcomes
- Applies conflict resolution rules (see AI_AGENT_SPECIFICATION.md)
- Outputs unified report: `{executive_summary, findings_by_severity[], action_plan[], agent_conflicts_resolved[]}`
- Security CRITICAL findings cannot be removed from the final report

### FR-06: Report UI
- Display findings grouped by severity: CRITICAL (red), HIGH (orange), MEDIUM (yellow), LOW (blue)
- Each finding shows: severity badge, agent source, file path, line number, description, recommendation
- Show Discussion Room transcript: agent name, message, timestamp, type (finding/challenge/agreement)
- Show conflict resolution explanations: "Security Agent overruled Architect Agent — reason: X"
- Confidence score displayed as percentage next to each finding

### FR-07: Authentication
- GitHub OAuth login (enables private repo access in future)
- Guest mode for demo: paste public repo URL without login
- JWT session tokens, 7-day expiry

### FR-08: Analysis History
- Store all analyses in database linked to user
- Allow re-viewing past reports
- Free tier: last 5 analyses stored

---

## Non-Functional Requirements

- **Latency**: Full analysis completes in < 45 seconds for repos up to 50 files
- **Streaming**: First Discussion Room message visible to user within 5 seconds of analysis start
- **Reliability**: If one agent fails, the analysis continues with remaining agents and notes the failure in the report
- **Cost**: Total LLM cost per analysis < $0.05 using Groq + Llama-3.3-70b or equivalent
- **Security**: Repository contents are never stored permanently; only analysis outputs are persisted
- **Scalability**: Backend must handle 3 concurrent analyses on free-tier infrastructure (Render free plan)
- **Browser support**: Chrome, Firefox, Safari — last 2 major versions

---

## MVP Scope

### Must Have
- GitHub public repo ingestion via URL
- Tree-Sitter AST parsing for Python and JavaScript
- Bandit security scan integration (Python repos)
- Semgrep integration (all languages)
- Architect Agent, Security Agent, Code Reviewer Agent — parallel execution
- Consensus Director Agent
- Real-time Discussion Room (SSE streaming)
- Conflict resolution with explanations visible in UI
- Final consensus report with severity grouping
- File path + line number citations on all findings
- GitHub OAuth login
- Guest/demo mode (no login required)
- Report persistence (last 5 per user)
- Clean UI with severity color coding

### Should Have
- Product Manager Agent
- QA Tester Agent
- Documentation Agent
- Agent confidence scores displayed in UI
- PR review analysis flow (analyze a diff instead of full repo)
- Before/after diff view showing issues found vs fixed
- Upstash Redis caching for repeated repo analyses

### Won't Build (MVP)
- CI/CD pipeline integration
- Architecture diagram auto-generation
- Voice-based agent discussions
- Jira/GitHub Issues export
- Private repository support (requires OAuth token scope expansion)
- Project health score over time
- Custom agent configuration
- Enterprise SSO
- Slack notifications
- GitHub App (automatic PR comments)

---

## Expected Deliverables

1. Working web application deployed to production URL (Vercel + Render)
2. Demo-ready analysis of a pre-cached sample repository (no live API call risk during demo)
3. All 4 must-build agents functioning
4. Discussion Room streaming without errors
5. Consensus Report rendering correctly for at least 3 different repository types

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM API rate limits during parallel agent execution | HIGH | HIGH | Use Groq (high rate limits on free tier); add retry with exponential backoff |
| Tree-Sitter parsing fails on unusual repo structures | MEDIUM | MEDIUM | Fallback to raw file content extraction if AST parse fails |
| Repo clone takes too long for large repositories | HIGH | HIGH | Enforce 50MB size limit; use GitHub API file tree endpoint instead of full clone where possible |
| SSE streaming breaks on Vercel serverless (30s timeout) | HIGH | HIGH | Move long-running analysis to Render backend; frontend polls or connects to Render SSE directly |
| Agent outputs don't fit structured JSON schema | MEDIUM | MEDIUM | Add JSON validation + retry prompt if malformed |
| Demo environment fails during live presentation | HIGH | CRITICAL | Pre-cache all demo analysis results; demo runs entirely from cached data |

---

## Assumptions

- GitHub repositories are public for MVP; no private repo authentication required
- Groq API free tier provides sufficient throughput for hackathon demo (500 requests/day)
- Repository size for demo repos is under 50MB
- Judges will view the product on a laptop browser, not mobile
- Tree-Sitter WASM bindings work in the Python backend (tested, not assumed)
- Neon PostgreSQL free tier (0.5GB) is sufficient for hackathon duration
- Upstash Redis free tier (10,000 commands/day) covers demo traffic
