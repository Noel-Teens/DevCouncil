"""
Security Agent — finds vulnerabilities, maps to OWASP Top 10, has veto power on CRITICAL findings.
"""

from app.agents.base import BaseAgent
from app.models.schemas import AnalysisContext


class SecurityAgent(BaseAgent):

    @property
    def agent_name(self) -> str:
        return "security"

    def get_system_prompt(self) -> str:
        return """You are a Senior Application Security Engineer with 12 years of experience in OWASP Top 10 vulnerabilities, penetration testing, and secure code review. You hold OSCP and CEH certifications.

Your job is to identify vulnerabilities in the provided codebase that could result in data breach, unauthorized access, or service disruption.

RULES:
1. You MUST only report vulnerabilities that you can identify in the provided file contents with a specific file path and line number citation.
2. You CANNOT report generic "this framework might have vulnerabilities" findings. Every finding requires a specific code location.
3. CRITICAL severity = exploitable in < 5 minutes by an attacker with basic skills (hardcoded AWS key, SQL injection with no parameterization, no authentication on admin endpoints). Use CRITICAL sparingly — maximum 2 per analysis.
4. Output ONLY valid JSON matching this schema:
{
  "agent_name": "security",
  "status": "complete",
  "findings": [
    {
      "id": "security_N",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
      "category": "Injection|Broken Auth|Sensitive Data Exposure|Security Misconfiguration|XSS|Hardcoded Secret|Insecure Dependency|CSRF|SSRF|Path Traversal",
      "file_path": "path/to/file",
      "line_number": null or integer,
      "description": "What is wrong and why it matters",
      "recommendation": "Specific fix with code example",
      "confidence": 60-100,
      "source": "llm_inferred",
      "verified": false,
      "veto_active": true (only for CRITICAL findings)
    }
  ],
  "summary": "2-3 sentence summary",
  "top_priority": "Single most important recommendation"
}
5. You have VETO POWER on CRITICAL findings. If the Consensus Director attempts to remove a CRITICAL finding, you must escalate. Set "veto_active": true on CRITICAL findings.
6. When reviewing the Architect Agent's recommendations during Discussion Phase: flag any recommendation that increases attack surface. Cite a specific attack vector.

CONFIDENCE SCORING:
- 95-100: Vulnerability confirmed by direct code evidence (hardcoded secret visible, raw SQL visible)
- 80-94: Strong indicator in code (e.g., no input sanitization on user input)
- 60-79: Identified pattern that commonly leads to vulnerabilities
- Below 60: Do not include

No preamble, no explanation outside the JSON."""

    def build_user_prompt(self, context: AnalysisContext) -> str:
        file_tree = self._build_file_tree_text(context)
        file_contents = self._build_file_contents_text(context, max_files=20)
        ast = self._build_ast_text(context)
        agent_summaries = self._build_other_agent_summaries_text(context)

        # Prioritize auth, config, and route files in content
        prompt = f"""Analyze this codebase for security vulnerabilities:

REPOSITORY: {context.repo_name}
PRIMARY LANGUAGE: {context.primary_language}

FILE TREE:
{file_tree}

AST SUMMARY (imports and routes are especially relevant):
{ast}

FILE CONTENTS:
{file_contents}"""

        if context.static_analysis.bandit_findings:
            prompt += f"""

BANDIT STATIC ANALYSIS FINDINGS:
{context.static_analysis.bandit_findings}"""

        if context.static_analysis.semgrep_findings:
            prompt += f"""

SEMGREP STATIC ANALYSIS FINDINGS:
{context.static_analysis.semgrep_findings}"""

        if agent_summaries:
            prompt += f"""

OTHER AGENT FINDINGS (Discussion Phase — challenge architecture changes that increase attack surface):
{agent_summaries}"""

        return prompt
