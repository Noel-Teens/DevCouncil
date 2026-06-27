"""
Consensus Director Agent — collects all findings, resolves conflicts, produces unified report.
"""

import json
import logging

from app.agents.base import BaseAgent
from app.models.schemas import (
    ActionItem,
    AgentOutput,
    AnalysisContext,
    ConflictResolution,
    ConsensusReport,
    DiscussionTurn,
    Finding,
)

logger = logging.getLogger(__name__)


class ConsensusDirectorAgent(BaseAgent):

    @property
    def agent_name(self) -> str:
        return "consensus_director"

    def get_system_prompt(self) -> str:
        return """You are the Chief Technical Officer reviewing the outputs of your engineering team. You have reports from your Architect, Security Engineer, and Code Reviewer. They have debated their findings. You must produce the final verdict.

CONFLICT RESOLUTION RULES (apply in order):
1. Security CRITICAL findings are locked. They appear in the report regardless of what other agents say. Do not remove them.
2. When Security Agent and Architect Agent conflict: Security wins on security-domain issues. Architect wins on architecture-domain issues. If the issue spans both, produce a resolution that satisfies the security requirement at lower architectural cost.
3. When two agents disagree on severity: the higher severity wins unless the lower-severity agent provides explicit evidence (file + line) that the risk is mitigated.
4. When the same issue is found by multiple agents: merge into one finding. Use the highest severity. Credit all agents that found it.
5. CONFIDENCE RULE: If only one agent flagged an issue with confidence < 65%, mark the finding as LOW severity regardless of original severity.

OUTPUT: Return ONLY a valid JSON object with this schema:
{
  "executive_summary": "3-5 sentence overview readable by a non-technical stakeholder",
  "findings": [
    {
      "id": "finding_id",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
      "category": "category",
      "file_path": "path/to/file",
      "line_number": null or integer,
      "description": "description",
      "recommendation": "recommendation",
      "confidence": 0-100,
      "source": "source_agent_name",
      "verified": false,
      "veto_active": false
    }
  ],
  "action_plan": [
    {
      "priority": 1,
      "finding_ids": ["finding_id"],
      "title": "Action title",
      "effort": "< 1 hour|< 1 day|< 1 week|> 1 week",
      "assignable_to": "any developer|senior engineer|security team"
    }
  ],
  "conflicts_resolved": [
    {
      "agent_a": "agent_name",
      "agent_b": "agent_name",
      "finding_ids": ["id1", "id2"],
      "winner": "agent_name",
      "reason": "Full explanation of why this agent's position was adopted"
    }
  ],
  "agents_that_participated": ["agent1", "agent2"],
  "agents_that_failed": []
}

For every conflict resolved, explain the resolution in plain language in the conflicts_resolved array. Do not abbreviate — judges will read these explanations.

No preamble, no explanation outside the JSON."""

    def build_user_prompt(self, context: AnalysisContext) -> str:
        # This is overridden — consensus uses a special prompt built from agent outputs
        return ""

    def build_consensus_prompt(
        self,
        agent_outputs: list[AgentOutput],
        discussion_turns: list[DiscussionTurn],
        failed_agents: list[str],
    ) -> str:
        """Build the user prompt specifically for consensus synthesis."""
        sections = []

        # Agent outputs
        for output in agent_outputs:
            findings_text = json.dumps(
                [f.model_dump() for f in output.findings], indent=2
            )
            sections.append(
                f"--- {output.agent_name.upper()} AGENT OUTPUT ---\n"
                f"Status: {output.status}\n"
                f"Summary: {output.summary}\n"
                f"Top Priority: {output.top_priority}\n"
                f"Findings:\n{findings_text}\n"
                f"--- END ---"
            )

        # Discussion turns
        if discussion_turns:
            discussion_text = "\n".join(
                f"  Round {t.round_number} | {t.agent_name} | {t.turn_type} "
                f"{'→ ' + t.target_agent if t.target_agent else ''}: {t.message}"
                for t in discussion_turns
            )
            sections.append(
                f"--- DISCUSSION LOG ---\n{discussion_text}\n--- END DISCUSSION ---"
            )

        # Failed agents
        if failed_agents:
            sections.append(f"FAILED AGENTS: {', '.join(failed_agents)}")

        return (
            "Synthesize the following agent outputs into a unified consensus report.\n"
            "Resolve all conflicts. Deduplicate findings. Generate the action plan.\n\n"
            + "\n\n".join(sections)
        )

    async def synthesize(
        self,
        agent_outputs: list[AgentOutput],
        discussion_turns: list[DiscussionTurn],
        failed_agents: list[str],
    ) -> ConsensusReport:
        """Run consensus synthesis."""
        system_prompt = self.get_system_prompt()
        user_prompt = self.build_consensus_prompt(
            agent_outputs, discussion_turns, failed_agents
        )

        try:
            raw_output = await self.call_llm(system_prompt, user_prompt)
            data = json.loads(raw_output)

            # Parse findings
            findings = []
            for f in data.get("findings", []):
                findings.append(Finding(
                    id=f.get("id", ""),
                    severity=f.get("severity", "MEDIUM"),
                    category=f.get("category", "General"),
                    file_path=f.get("file_path", "unknown"),
                    line_number=f.get("line_number"),
                    description=f.get("description", ""),
                    recommendation=f.get("recommendation", ""),
                    confidence=max(0, min(100, f.get("confidence", 70))),
                    source=f.get("source", "consensus"),
                    verified=f.get("verified", False),
                    veto_active=f.get("veto_active", False),
                ))

            # Parse action plan
            action_plan = []
            for a in data.get("action_plan", []):
                action_plan.append(ActionItem(
                    priority=a.get("priority", 99),
                    finding_ids=a.get("finding_ids", []),
                    title=a.get("title", ""),
                    effort=a.get("effort", "< 1 day"),
                    assignable_to=a.get("assignable_to", "any developer"),
                ))

            # Parse conflict resolutions
            conflicts_resolved = []
            for c in data.get("conflicts_resolved", []):
                conflicts_resolved.append(ConflictResolution(
                    agent_a=c.get("agent_a", ""),
                    agent_b=c.get("agent_b", ""),
                    finding_ids=c.get("finding_ids", []),
                    winner=c.get("winner", ""),
                    reason=c.get("reason", ""),
                ))

            participated = data.get(
                "agents_that_participated",
                [o.agent_name for o in agent_outputs],
            )

            return ConsensusReport(
                executive_summary=data.get("executive_summary", ""),
                findings=findings,
                action_plan=action_plan,
                conflicts_resolved=conflicts_resolved,
                agents_that_participated=participated,
                agents_that_failed=data.get("agents_that_failed", failed_agents),
            )

        except Exception as e:
            logger.error(f"Consensus Director failed: {e}")
            # Deterministic fallback: merge all findings, sort by severity
            return self._deterministic_fallback(agent_outputs, failed_agents)

    def _deterministic_fallback(
        self,
        agent_outputs: list[AgentOutput],
        failed_agents: list[str],
    ) -> ConsensusReport:
        """Fallback when LLM consensus fails — deterministic merge."""
        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
        all_findings: list[Finding] = []
        seen_keys: set[str] = set()

        for output in agent_outputs:
            for finding in output.findings:
                # Dedup by file + line + category
                key = f"{finding.file_path}:{finding.line_number}:{finding.category}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    all_findings.append(finding)

        # Sort by severity
        all_findings.sort(key=lambda f: severity_order.get(f.severity, 4))

        # Build action plan from findings
        action_plan = []
        for i, finding in enumerate(all_findings[:10]):
            action_plan.append(ActionItem(
                priority=i + 1,
                finding_ids=[finding.id],
                title=f"Fix: {finding.category} in {finding.file_path}",
                effort="< 1 day",
                assignable_to="any developer",
            ))

        return ConsensusReport(
            executive_summary=(
                f"Analysis produced {len(all_findings)} findings across "
                f"{len(agent_outputs)} agents. Consensus was generated using "
                f"deterministic fallback due to LLM failure."
            ),
            findings=all_findings,
            action_plan=action_plan,
            conflicts_resolved=[],
            agents_that_participated=[o.agent_name for o in agent_outputs],
            agents_that_failed=failed_agents,
        )
