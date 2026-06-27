"""
GitHub repository ingestion service.
Fetches file tree and contents via the GitHub API.
"""

import asyncio
import logging
import re
from pathlib import PurePosixPath

import httpx

from app.config import get_settings
from app.models.schemas import (
    ASTSummary,
    AnalysisContext,
    FileContent,
    FileEntry,
    StaticAnalysisOutput,
)

logger = logging.getLogger(__name__)

# File extensions we analyze
SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".java",
    ".json", ".yaml", ".yml", ".toml", ".cfg", ".ini",
    ".md", ".txt", ".html", ".css", ".scss",
    ".sql", ".sh", ".bash", ".dockerfile",
    ".env.example", ".gitignore",
}

# Extensions to detect primary language
LANGUAGE_MAP = {
    ".py": "Python",
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".jsx": "JavaScript",
    ".go": "Go",
    ".java": "Java",
}

# Binary / large file extensions to skip
SKIP_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".woff", ".woff2", ".ttf", ".eot",
    ".zip", ".tar", ".gz", ".bz2",
    ".exe", ".dll", ".so", ".dylib",
    ".pdf", ".doc", ".docx",
    ".mp3", ".mp4", ".avi", ".mov",
    ".lock", ".min.js", ".min.css",
}


def parse_github_url(url: str) -> tuple[str, str]:
    """Extract owner and repo name from a GitHub URL."""
    patterns = [
        r"github\.com[/:]([^/]+)/([^/.]+?)(?:\.git)?/?$",
        r"github\.com[/:]([^/]+)/([^/]+?)/?$",
    ]
    for pattern in patterns:
        match = re.search(pattern, url.strip())
        if match:
            return match.group(1), match.group(2)
    raise ValueError(f"Invalid GitHub URL: {url}")


def detect_language(ext: str) -> str | None:
    """Map file extension to language name."""
    return LANGUAGE_MAP.get(ext)


def should_include_file(path: str, size: int) -> bool:
    """Check if a file should be included in analysis."""
    settings = get_settings()
    p = PurePosixPath(path)

    # Skip by extension
    if p.suffix.lower() in SKIP_EXTENSIONS:
        return False

    # Skip lock files and minified files
    name_lower = p.name.lower()
    if name_lower in ("package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock"):
        return False
    if ".min." in name_lower:
        return False

    # Skip node_modules, .git, __pycache__, etc.
    parts = p.parts
    skip_dirs = {"node_modules", ".git", "__pycache__", ".next", "dist", "build", "venv", ".venv"}
    if any(part in skip_dirs for part in parts):
        return False

    # Skip files over size limit
    max_size = settings.max_file_size_kb * 1024
    if size > max_size:
        return False

    return True


async def fetch_repo_tree(owner: str, repo: str) -> list[dict]:
    """Fetch the full file tree from GitHub API."""
    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "DevCouncil-AI",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code == 404:
            raise ValueError(f"Repository not found: {owner}/{repo}")
        if resp.status_code == 403:
            raise ValueError("GitHub API rate limit exceeded. Please try again later.")
        resp.raise_for_status()

        data = resp.json()
        # Filter to blobs (files) only
        return [
            item for item in data.get("tree", [])
            if item.get("type") == "blob"
        ]


async def fetch_file_content(owner: str, repo: str, path: str) -> str | None:
    """Fetch a single file's content from GitHub API."""
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    headers = {
        "Accept": "application/vnd.github.v3.raw",
        "User-Agent": "DevCouncil-AI",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                return None
            text = resp.text
            # Truncate to ~6000 chars to fit agent context windows
            return text[:6000] if len(text) > 6000 else text
        except Exception as e:
            logger.warning(f"Failed to fetch {path}: {e}")
            return None


async def fetch_file_contents_batch(
    owner: str, repo: str, file_entries: list[FileEntry], max_files: int = 40
) -> list[FileContent]:
    """Fetch contents for multiple files concurrently."""
    # Prioritize source code files over config files
    priority_exts = {".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".java"}
    sorted_files = sorted(
        file_entries,
        key=lambda f: (0 if PurePosixPath(f.path).suffix in priority_exts else 1, f.size),
    )

    # Limit to max_files to avoid API rate limits
    files_to_fetch = sorted_files[:max_files]

    async def fetch_one(entry: FileEntry) -> FileContent | None:
        content = await fetch_file_content(owner, repo, entry.path)
        if content:
            return FileContent(
                path=entry.path,
                content=content,
                language=entry.language,
            )
        return None

    # Fetch with semaphore to limit concurrent requests
    sem = asyncio.Semaphore(10)

    async def fetch_with_sem(entry: FileEntry) -> FileContent | None:
        async with sem:
            return await fetch_one(entry)

    results = await asyncio.gather(
        *[fetch_with_sem(f) for f in files_to_fetch],
        return_exceptions=True,
    )

    return [r for r in results if isinstance(r, FileContent)]


def extract_ast_summary(file_contents: list[FileContent]) -> ASTSummary:
    """Extract basic AST-like information from file contents using regex patterns.
    This is a lightweight alternative to Tree-Sitter for faster development.
    """
    functions: list[str] = []
    classes: list[str] = []
    imports: list[str] = []
    routes: list[str] = []

    for fc in file_contents:
        content = fc.content
        lang = fc.language

        if lang == "Python":
            # Python functions
            functions.extend(
                m.group(1) for m in re.finditer(r"(?:^|\n)\s*(?:async\s+)?def\s+(\w+)", content)
            )
            # Python classes
            classes.extend(
                m.group(1) for m in re.finditer(r"(?:^|\n)\s*class\s+(\w+)", content)
            )
            # Python imports
            imports.extend(
                m.group(0).strip()
                for m in re.finditer(r"(?:^|\n)\s*(?:from\s+\S+\s+)?import\s+.+", content)
            )
            # FastAPI/Flask routes
            routes.extend(
                m.group(0).strip()
                for m in re.finditer(
                    r'@(?:app|router)\.\s*(?:get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)',
                    content,
                )
            )

        elif lang in ("JavaScript", "TypeScript"):
            # JS/TS functions
            functions.extend(
                m.group(1) for m in re.finditer(
                    r"(?:function|const|let|var)\s+(\w+)\s*(?:=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\([^)]*\)\s*{)|\s*\()",
                    content,
                )
            )
            # JS/TS classes
            classes.extend(
                m.group(1) for m in re.finditer(r"class\s+(\w+)", content)
            )
            # JS/TS imports
            imports.extend(
                m.group(0).strip()
                for m in re.finditer(r"(?:^|\n)\s*import\s+.+", content)
            )
            # Express/Next.js routes
            routes.extend(
                m.group(0).strip()
                for m in re.finditer(
                    r"(?:app|router)\.\s*(?:get|post|put|delete|patch)\s*\(",
                    content,
                )
            )

    return ASTSummary(
        functions=functions[:100],  # Limit to prevent context overflow
        classes=classes[:50],
        imports=imports[:50],
        routes=routes[:30],
    )


def detect_primary_language(file_entries: list[FileEntry]) -> str:
    """Detect the primary language from file extensions."""
    lang_count: dict[str, int] = {}
    for entry in file_entries:
        if entry.language:
            lang_count[entry.language] = lang_count.get(entry.language, 0) + 1
    if not lang_count:
        return "unknown"
    return max(lang_count, key=lang_count.get)


async def ingest_repository(repo_url: str) -> AnalysisContext:
    """Full repository ingestion pipeline.

    1. Parse GitHub URL
    2. Fetch file tree
    3. Filter files
    4. Fetch file contents (top 40 files)
    5. Extract AST summary
    6. Return AnalysisContext
    """
    owner, repo = parse_github_url(repo_url)
    logger.info(f"Ingesting repository: {owner}/{repo}")

    # Fetch file tree
    tree_items = await fetch_repo_tree(owner, repo)

    # Build file entries
    settings = get_settings()
    total_size = 0
    file_entries: list[FileEntry] = []

    for item in tree_items:
        path = item.get("path", "")
        size = item.get("size", 0)

        if not should_include_file(path, size):
            continue

        total_size += size
        if total_size > settings.max_repo_size_mb * 1024 * 1024:
            logger.warning(f"Repository exceeds {settings.max_repo_size_mb}MB limit, truncating")
            break

        ext = PurePosixPath(path).suffix
        file_entries.append(FileEntry(
            path=path,
            size=size,
            language=detect_language(ext),
        ))

    logger.info(f"Found {len(file_entries)} analyzable files (total: {total_size / 1024:.0f}KB)")

    # Fetch file contents
    file_contents = await fetch_file_contents_batch(owner, repo, file_entries)
    logger.info(f"Fetched content for {len(file_contents)} files")

    # Extract AST summary
    ast_summary = extract_ast_summary(file_contents)

    # Detect primary language
    primary_language = detect_primary_language(file_entries)

    return AnalysisContext(
        repo_url=repo_url,
        repo_name=f"{owner}/{repo}",
        primary_language=primary_language,
        file_tree=file_entries,
        file_contents=file_contents,
        ast_summary=ast_summary,
    )
