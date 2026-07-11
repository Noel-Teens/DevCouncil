"""
Static-analysis grounding.

Runs Bandit (a real Python security linter) over the fetched source files so the
Security Agent's findings can be anchored to concrete scanner output — the
"no scanner hit = no finding" guarantee that separates DevCouncil from a single
LLM playing dress-up. Bandit is pure Python and runs fine on Windows/Linux/macOS.

Non-Python repos simply yield no Bandit findings; the pipeline degrades to
LLM-only analysis without error.
"""

import asyncio
import json
import logging
import os
import sys
import tempfile

logger = logging.getLogger(__name__)

# Bandit severity/confidence come back as strings; keep them as-is for the prompt.
_BANDIT_TIMEOUT_SECONDS = 25


async def run_bandit(file_contents) -> list[dict]:
    """Run Bandit over the Python files in ``file_contents``.

    Args:
        file_contents: list of FileContent (path, content, language).

    Returns:
        A list of normalized finding dicts:
        ``{file_path, line_number, test_id, issue_text, severity, confidence}``.
        Empty on any error, timeout, or if Bandit is unavailable.
    """
    py_files = [
        fc for fc in file_contents
        if fc.path.endswith(".py") and fc.content
    ]
    if not py_files:
        return []

    tmpdir = tempfile.mkdtemp(prefix="devcouncil_bandit_")
    try:
        # Materialize the fetched files, preserving repo-relative paths.
        for fc in py_files:
            # Guard against path traversal from a hostile repo path.
            safe_rel = fc.path.replace("\\", "/").lstrip("/")
            dest = os.path.normpath(os.path.join(tmpdir, safe_rel))
            if not dest.startswith(os.path.normpath(tmpdir)):
                continue
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "w", encoding="utf-8", errors="ignore") as f:
                f.write(fc.content)

        # Run Bandit as a subprocess: `python -m bandit -r <dir> -f json -q`.
        # Bandit exits 1 when it finds issues, so we don't gate on returncode.
        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "bandit", "-r", tmpdir, "-f", "json", "-q",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, _ = await asyncio.wait_for(
                proc.communicate(), timeout=_BANDIT_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            proc.kill()
            logger.warning("Bandit timed out; skipping static analysis")
            return []

        if not stdout:
            return []

        data = json.loads(stdout.decode("utf-8", errors="ignore"))
        findings = []
        prefix = os.path.normpath(tmpdir) + os.sep
        for r in data.get("results", []):
            filename = os.path.normpath(r.get("filename", ""))
            rel = filename[len(prefix):] if filename.startswith(prefix) else filename
            rel = rel.replace("\\", "/")
            findings.append({
                "file_path": rel,
                "line_number": r.get("line_number"),
                "test_id": r.get("test_id"),          # e.g. "B105"
                "issue_text": r.get("issue_text", ""),
                "severity": r.get("issue_severity", "UNDEFINED"),
                "confidence": r.get("issue_confidence", "UNDEFINED"),
            })
        return findings

    except FileNotFoundError:
        logger.warning("Bandit not installed; skipping static analysis")
        return []
    except Exception as e:
        logger.warning(f"Bandit run failed: {e}")
        return []
    finally:
        # Best-effort cleanup of the temp dir.
        try:
            import shutil
            shutil.rmtree(tmpdir, ignore_errors=True)
        except Exception:
            pass
