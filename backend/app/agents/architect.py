"""
Architect Agent — identifies architectural weaknesses, coupling, scalability problems.
"""

from app.agents.base import BaseAgent
from app.models.schemas import AnalysisContext


class ArchitectAgent(BaseAgent):

    @property
    def agent_name(self) -> str:
        return "architect"

    def get_system_prompt(self) -> str:
        return """You are a Principal Software Architect with 15 years of experience designing systems at companies including Google and Stripe. You have reviewed hundreds of codebases and have strong opinions backed by documented failure cases.

Your job is to analyze the provided codebase structure and identify architectural issues that will cause technical debt, scaling failures, or maintenance nightmares within 6 months of production use.

RULES:
1. Every finding must reference a specific file path. If you cannot cite a file, do not include the finding.
2. Findings must describe a concrete consequence, not a best-practice violation in the abstract. "This will cause X when Y happens" is correct. "This is not following clean architecture" is not.
3. Output ONLY a JSON object matching this schema:
{
  "agent_name": "architect",
  "status": "complete",
  "findings": [
    {
      "id": "architect_N",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
      "category": "Architecture Pattern|Coupling|Scalability|API Design|Configuration Management|Dependency Management",
      "file_path": "path/to/file",
      "line_number": null or integer,
      "description": "What is wrong and why it matters",
      "recommendation": "Specific fix, not generic advice",
      "confidence": 50-100,
      "source": "ast|llm_inferred",
      "verified": false
    }
  ],
  "summary": "2-3 sentence summary of key concerns",
  "top_priority": "Single most important recommendation"
}
4. Confidence score: 90-100 = you see this exact pattern failing in production regularly. 70-89 = strong concern. 50-69 = worth flagging. Below 50 = do not include.
5. Do not flag what the Security Agent should flag (vulnerabilities, auth issues). Stay in your domain.
6. You will receive a summary of what the Security Agent and Code Reviewer found. You may challenge their recommendations if the architectural cost of their fix is disproportionate to the risk. State your challenge explicitly in your finding's description with the format: "CHALLENGE security_2: [your reasoning]".
7. No preamble, no explanation outside the JSON."""

    def build_user_prompt(self, context: AnalysisContext) -> str:
        file_tree = self._build_file_tree_text(context)
        file_contents = self._build_file_contents_text(context)
        ast = self._build_ast_text(context)
        agent_summaries = self._build_other_agent_summaries_text(context)

        prompt = f"""Analyze this codebase for architectural issues:

REPOSITORY: {context.repo_name}
PRIMARY LANGUAGE: {context.primary_language}

FILE TREE:
{file_tree}

AST SUMMARY:
{ast}

FILE CONTENTS:
{file_contents}"""

        if agent_summaries:
            prompt += f"""

OTHER AGENT FINDINGS (Discussion Phase — you may challenge these):
{agent_summaries}"""

        if context.project_description:
            prompt += f"""

PROJECT DESCRIPTION:
{context.project_description}"""

        return prompt
