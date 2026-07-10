import pytest

from src.shared_kernel.infrastructure.cache import TTLCache


@pytest.mark.asyncio
async def test_cache_set_and_get() -> None:
    cache: TTLCache[str] = TTLCache(ttl_seconds=60)
    await cache.set("key1", "value1")
    result = await cache.get("key1")
    assert result == "value1"


@pytest.mark.asyncio
async def test_cache_miss() -> None:
    cache: TTLCache[str] = TTLCache(ttl_seconds=60)
    result = await cache.get("nonexistent")
    assert result is None


@pytest.mark.asyncio
async def test_cache_invalidate() -> None:
    cache: TTLCache[str] = TTLCache(ttl_seconds=60)
    await cache.set("key1", "value1")
    await cache.invalidate("key1")
    result = await cache.get("key1")
    assert result is None


@pytest.mark.asyncio
async def test_cache_expiry() -> None:
    cache: TTLCache[str] = TTLCache(ttl_seconds=0)
    await cache.set("key1", "value1")
    import time
    time.sleep(0.01)
    result = await cache.get("key1")
    assert result is None


@pytest.mark.asyncio
async def test_cache_clear() -> None:
    cache: TTLCache[str] = TTLCache(ttl_seconds=60)
    await cache.set("key1", "value1")
    await cache.set("key2", "value2")
    await cache.clear()
    assert await cache.get("key1") is None
    assert await cache.get("key2") is None


@pytest.mark.asyncio
async def test_cache_maxsize_eviction() -> None:
    cache: TTLCache[int] = TTLCache(ttl_seconds=60, maxsize=3)
    await cache.set("a", 1)
    await cache.set("b", 2)
    await cache.set("c", 3)
    assert cache.size == 3
    await cache.set("d", 4)
    assert cache.size <= 3


@pytest.mark.asyncio
async def test_cache_get_or_compute_hit() -> None:
    cache: TTLCache[str] = TTLCache(ttl_seconds=60)
    await cache.set("key", "cached")
    result = await cache.get_or_compute("key", lambda: "computed")
    assert result == "cached"


@pytest.mark.asyncio
async def test_cache_get_or_compute_miss() -> None:
    cache: TTLCache[str] = TTLCache(ttl_seconds=60)
    result = await cache.get_or_compute("key", lambda: "computed")
    assert result == "computed"
    cached = await cache.get("key")
    assert cached == "computed"


@pytest.mark.asyncio
async def test_cache_stats() -> None:
    cache: TTLCache[str] = TTLCache(ttl_seconds=30, maxsize=64)
    await cache.set("k", "v")
    stats = cache.stats()
    assert stats["size"] == 1
    assert stats["maxsize"] == 64
    assert stats["ttl_seconds"] == 30
