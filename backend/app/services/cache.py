"""
Redis cache service using Upstash Redis.
Falls back to in-memory cache if Redis is unavailable.
"""

import json
import logging
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)

_memory_cache: dict[str, str] = {}
_redis_client = None


async def get_redis():
    """Get or create Redis client."""
    global _redis_client
    settings = get_settings()

    if _redis_client is not None:
        return _redis_client

    if not settings.upstash_redis_url:
        logger.info("No Redis URL configured, using in-memory cache")
        return None

    try:
        import redis.asyncio as aioredis
        _redis_client = aioredis.from_url(
            settings.upstash_redis_url,
            decode_responses=True,
        )
        await _redis_client.ping()
        logger.info("Connected to Redis")
        return _redis_client
    except Exception as e:
        logger.warning(f"Redis connection failed, using in-memory cache: {e}")
        return None


async def cache_get(key: str) -> str | None:
    """Get a value from cache."""
    client = await get_redis()
    if client:
        try:
            return await client.get(key)
        except Exception:
            pass
    return _memory_cache.get(key)


async def cache_set(key: str, value: str, ttl_seconds: int = 3600) -> None:
    """Set a value in cache with TTL."""
    client = await get_redis()
    if client:
        try:
            await client.set(key, value, ex=ttl_seconds)
            return
        except Exception:
            pass
    _memory_cache[key] = value


async def cache_get_json(key: str) -> Any | None:
    """Get a JSON value from cache."""
    raw = await cache_get(key)
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None
    return None


async def cache_set_json(key: str, value: Any, ttl_seconds: int = 3600) -> None:
    """Set a JSON value in cache."""
    await cache_set(key, json.dumps(value), ttl_seconds)


async def check_rate_limit(user_id: str, max_per_day: int = 5) -> bool:
    """Check if user has exceeded daily rate limit. Returns True if allowed."""
    key = f"rate_limit:{user_id}"
    client = await get_redis()
    if client:
        try:
            count = await client.get(key)
            if count and int(count) >= max_per_day:
                return False
            pipe = client.pipeline()
            pipe.incr(key)
            pipe.expire(key, 86400)  # 24 hours
            await pipe.execute()
            return True
        except Exception:
            pass
    # In-memory fallback — always allow
    return True
