"""
Base agent class with Groq LLM integration, JSON parsing, retry logic, and timeout handling.
"""

import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod

from groq import AsyncGroq

from app.config import get_settings
from app.models.schemas import AgentOutput, AnalysisContext, Finding

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Base class for all DevCouncil AI agents."""

    def __init__(self):
        self.settings = get_settings()
        self.client = AsyncGroq(api_key=self.settings.groq_api_key)
        self.model = "llama-3.3-70b-versatile"
        self.max_retries = 2
        self.temperature = 0.3

    @property
    @abstractmethod
    def agent_name(self) -> str:
        """Unique agent identifier."""
        ...

    @abstractmethod
    def get_system_prompt(self) -> str:
        """Return the agent's system prompt."""
        ...

    @abstractmethod
    def build_user_prompt(self, context: AnalysisContext) -> str:
        """Build the user prompt from analysis context."""
        ...

    def _build_file_tree_text(self, context: AnalysisContext, max_entries: int = 100) -> str:
        """Format the file tree as readable text."""
        lines = []
        for entry in context.file_tree[:max_entries]:
            lang_tag = f" [{entry.language}]" if entry.language else ""
            lines.append(f"  {entry.path} ({entry.size}B){lang_tag}")
        if len(context.file_tree) > max_entries:
            lines.append(f"  ... and {len(context.file_tree) - max_entries} more files")
        return "\n".join(lines)

    def _build_file_contents_text(self, context: AnalysisContext, max_files: int = 15) -> str:
        """Format file contents for the prompt."""
        sections = []
        for fc in context.file_contents[:max_files]:
            # Truncate content to manage token count
            content = fc.content[:4000]
            sections.append(
                f"--- FILE: {fc.path} [{fc.language or 'unknown'}] ---\n{content}\n--- END FILE ---"
            )
        return "\n\n".join(sections)

    def _build_ast_text(self, context: AnalysisContext) -> str:
        """Format AST summary."""
        parts = []
        if context.ast_summary.functions:
            parts.append(f"Functions: {', '.join(context.ast_summary.functions[:30])}")
        if context.ast_summary.classes:
            parts.append(f"Classes: {', '.join(context.ast_summary.classes[:20])}")
        if context.ast_summary.imports:
            parts.append(f"Imports: {', '.join(context.ast_summary.imports[:20])}")
        if context.ast_summary.routes:
            parts.append(f"Routes: {', '.join(context.ast_summary.routes[:15])}")
        return "\n".join(parts) if parts else "No AST data available."

    def _build_other_agent_summaries_text(self, context: AnalysisContext) -> str:
        """Format other agents' summaries for discussion phase."""
        if not context.other_agent_summaries:
            return ""
        sections = []
        for summary in context.other_agent_summaries:
            sections.append(
                f"--- {summary.agent_name.upper()} AGENT SUMMARY ---\n"
                f"Summary: {summary.summary}\n"
                f"Top Priority: {summary.top_priority}\n"
                f"Findings Count: {summary.finding_count}\n"
                f"--- END ---"
            )
        return "\n\n".join(sections)

    async def call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """Make a Groq API call with the given prompts."""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=self.temperature,
                max_tokens=4096,
                response_format={"type": "json_object"},
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"[{self.agent_name}] LLM call failed: {e}")
            raise

    def parse_output(self, raw_output: str) -> AgentOutput:
        """Parse and validate LLM JSON output into AgentOutput."""
        try:
            data = json.loads(raw_output)

            # Normalize findings
            findings = []
            for i, f in enumerate(data.get("findings", [])):
                finding = Finding(
                    id=f.get("id", f"{self.agent_name}_{i + 1}"),
                    severity=f.get("severity", "MEDIUM"),
                    category=f.get("category", "General"),
                    file_path=f.get("file_path", "unknown"),
                    line_number=f.get("line_number"),
                    description=f.get("description", ""),
                    recommendation=f.get("recommendation", ""),
                    confidence=max(0, min(100, f.get("confidence", 70))),
                    source=f.get("source", "llm_inferred"),
                    verified=f.get("verified", False),
                    veto_active=f.get("veto_active", False),
                )
                findings.append(finding)

            return AgentOutput(
                agent_name=data.get("agent_name", self.agent_name),
                status=data.get("status", "complete"),
                findings=findings,
                summary=data.get("summary", ""),
                top_priority=data.get("top_priority", ""),
            )
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"[{self.agent_name}] Failed to parse output: {e}")
            raise ValueError(f"Invalid agent output: {e}")

    async def analyze(self, context: AnalysisContext) -> AgentOutput:
        """Run the full agent analysis with retry and timeout."""
        start_time = time.time()
        system_prompt = self.get_system_prompt()
        user_prompt = self.build_user_prompt(context)

        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"[{self.agent_name}] Attempt {attempt}/{self.max_retries}")

                # Apply timeout
                raw_output = await asyncio.wait_for(
                    self.call_llm(system_prompt, user_prompt),
                    timeout=self.settings.agent_timeout_seconds,
                )

                output = self.parse_output(raw_output)
                duration_ms = int((time.time() - start_time) * 1000)
                logger.info(
                    f"[{self.agent_name}] Complete in {duration_ms}ms "
                    f"with {len(output.findings)} findings"
                )
                return output

            except asyncio.TimeoutError:
                logger.warning(f"[{self.agent_name}] Timed out after {self.settings.agent_timeout_seconds}s")
                last_error = "Agent timed out"
            except ValueError as e:
                logger.warning(f"[{self.agent_name}] Parse error on attempt {attempt}: {e}")
                last_error = str(e)
                # On parse failure, add a retry hint to the prompt
                if attempt < self.max_retries:
                    user_prompt = (
                        "IMPORTANT: Your previous response was not valid JSON. "
                        "Return ONLY a valid JSON object matching the schema. "
                        "No preamble, no explanation outside the JSON.\n\n"
                        + user_prompt
                    )
            except Exception as e:
                logger.error(f"[{self.agent_name}] Unexpected error: {e}")
                last_error = str(e)

        # All retries exhausted — return failed output
        logger.error(f"[{self.agent_name}] Failed after {self.max_retries} attempts: {last_error}")
        return AgentOutput(
            agent_name=self.agent_name,
            status="failed",
            findings=[],
            summary=f"Agent failed: {last_error}",
            top_priority="",
        )
