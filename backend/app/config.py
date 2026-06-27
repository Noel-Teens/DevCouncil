from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # LLM
    groq_api_key: str = ""

    # Database
    database_url: str = "sqlite+aiosqlite:///./devcouncil.db"

    # GitHub OAuth
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:3000/api/auth/callback"

    # JWT
    jwt_secret: str = "change-this-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_days: int = 7

    # Redis
    upstash_redis_url: str = ""
    upstash_redis_token: str = ""

    # App
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    max_repo_size_mb: int = 50
    max_file_size_kb: int = 200
    agent_timeout_seconds: int = 30
    max_discussion_rounds: int = 3

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
