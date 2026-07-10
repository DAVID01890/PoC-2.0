from __future__ import annotations

import asyncio
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Generic, TypeVar

T = TypeVar("T")


@dataclass
class CacheEntry(Generic[T]):
    value: T
    expires_at: float


class TTLCache(Generic[T]):
    def __init__(self, ttl_seconds: float = 60.0, maxsize: int = 128) -> None:
        self._ttl = ttl_seconds
        self._maxsize = maxsize
        self._data: dict[str, CacheEntry[T]] = {}
        self._lock = asyncio.Lock()

    @property
    def ttl(self) -> float:
        return self._ttl

    @property
    def size(self) -> int:
        return len(self._data)

    async def get(self, key: str) -> T | None:
        async with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return None
            if time.monotonic() > entry.expires_at:
                del self._data[key]
                return None
            return entry.value

    async def set(self, key: str, value: T) -> None:
        async with self._lock:
            if len(self._data) >= self._maxsize:
                self._evict()
            self._data[key] = CacheEntry(
                value=value,
                expires_at=time.monotonic() + self._ttl,
            )

    async def invalidate(self, key: str) -> None:
        async with self._lock:
            self._data.pop(key, None)

    async def clear(self) -> None:
        async with self._lock:
            self._data.clear()

    async def get_or_compute(self, key: str, factory: Callable[[], Any]) -> T | None:
        cached = await self.get(key)
        if cached is not None:
            return cached
        value = await factory() if asyncio.iscoroutinefunction(factory) else factory()
        if value is not None:
            await self.set(key, value)
        return value

    def _evict(self) -> None:
        oldest = min(self._data.keys(), key=lambda k: self._data[k].expires_at)
        del self._data[oldest]

    def stats(self) -> dict[str, Any]:
        return {
            "size": len(self._data),
            "maxsize": self._maxsize,
            "ttl_seconds": self._ttl,
        }
