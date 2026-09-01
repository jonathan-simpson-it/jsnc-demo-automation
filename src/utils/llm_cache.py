"""Simple in-memory LLM response cache.

Avoids redundant API calls for repeated queries and classification.
Uses a dict keyed by (query_hash, agent_type) with TTL expiry.
"""

import hashlib
import time
from typing import Any


class LLMCache:
    """TTL-based in-memory cache for LLM responses."""

    def __init__(self, ttl_seconds: int = 3600, max_size: int = 500):
        """Initialize the cache.

        Args:
            ttl_seconds: Time-to-live for cache entries. Default 1 hour.
            max_size: Maximum number of entries before LRU eviction.
        """
        self.ttl = ttl_seconds
        self.max_size = max_size
        self._cache: dict[str, tuple[Any, float]] = {}
        self._access_order: list[str] = []

    def _make_key(self, query: str, prefix: str = "") -> str:
        """Create a cache key from query and optional prefix."""
        raw = f"{prefix}:{query.strip().lower()}"
        return hashlib.md5(raw.encode()).hexdigest()

    def get(self, query: str, prefix: str = "") -> Any | None:
        """Get a cached response if available and not expired.

        Args:
            query: The original query.
            prefix: Optional prefix (e.g., agent_type) to namespace keys.

        Returns:
            Cached response or None.
        """
        key = self._make_key(query, prefix)
        if key in self._cache:
            value, timestamp = self._cache[key]
            if time.time() - timestamp < self.ttl:
                # Move to end of access order (most recently used)
                if key in self._access_order:
                    self._access_order.remove(key)
                self._access_order.append(key)
                return value
            else:
                # Expired
                del self._cache[key]
                if key in self._access_order:
                    self._access_order.remove(key)
        return None

    def set(self, query: str, value: Any, prefix: str = "") -> None:
        """Store a response in the cache.

        Args:
            query: The original query.
            value: The response to cache.
            prefix: Optional prefix to namespace keys.
        """
        key = self._make_key(query, prefix)

        # Evict LRU if at capacity
        while len(self._cache) >= self.max_size and self._access_order:
            oldest = self._access_order.pop(0)
            self._cache.pop(oldest, None)

        self._cache[key] = (value, time.time())
        if key in self._access_order:
            self._access_order.remove(key)
        self._access_order.append(key)

    def invalidate(self, query: str, prefix: str = "") -> None:
        """Remove a specific entry from the cache."""
        key = self._make_key(query, prefix)
        self._cache.pop(key, None)
        if key in self._access_order:
            self._access_order.remove(key)

    def clear(self) -> None:
        """Clear all cached entries."""
        self._cache.clear()
        self._access_order.clear()

    @property
    def size(self) -> int:
        """Number of entries in the cache."""
        return len(self._cache)


# Global cache instance
llm_cache = LLMCache(ttl_seconds=3600, max_size=500)
