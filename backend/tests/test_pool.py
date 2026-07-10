import os
import tempfile

import pytest

from src.db.pool import AsyncSQLitePool
from src.entrypoint.config import Settings


@pytest.fixture
def settings() -> Settings:
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    old_path = os.environ.get("SQLITE_PATH", "local.db")
    os.environ["SQLITE_PATH"] = path
    yield Settings.from_env()
    os.environ["SQLITE_PATH"] = old_path


@pytest.mark.asyncio
async def test_pool_acquire_release(settings: Settings) -> None:
    pool = AsyncSQLitePool(settings, min_size=1, max_size=2)
    conn = await pool.acquire()
    result = await conn.execute("SELECT 1")
    row = await result.fetchone()
    assert row[0] == 1
    await pool.release(conn)
    await pool.close()


@pytest.mark.asyncio
async def test_pool_reuses_connections(settings: Settings) -> None:
    pool = AsyncSQLitePool(settings, min_size=1, max_size=2)
    conn1 = await pool.acquire()
    await pool.release(conn1)
    conn2 = await pool.acquire()
    assert conn1 is conn2
    await pool.release(conn2)
    await pool.close()


@pytest.mark.asyncio
async def test_pool_warmup(settings: Settings) -> None:
    pool = AsyncSQLitePool(settings, min_size=2, max_size=4)
    await pool.warmup()
    assert pool.size >= 2
    await pool.close()


@pytest.mark.asyncio
async def test_pool_context_manager(settings: Settings) -> None:
    pool = AsyncSQLitePool(settings, min_size=1, max_size=2)
    async with pool.connection() as conn:
        result = await conn.execute("SELECT 1 + 1")
        row = await result.fetchone()
        assert row[0] == 2
    await pool.close()


@pytest.mark.asyncio
async def test_pool_close(settings: Settings) -> None:
    pool = AsyncSQLitePool(settings, min_size=1, max_size=2)
    await pool.acquire()
    await pool.acquire()
    await pool.close()
    assert pool.size == 2


@pytest.mark.asyncio
async def test_pool_closed_raises(settings: Settings) -> None:
    pool = AsyncSQLitePool(settings, min_size=1, max_size=2)
    await pool.close()
    with pytest.raises(RuntimeError, match="Pool is closed"):
        await pool.acquire()


@pytest.mark.asyncio
async def test_pool_settings(settings: Settings) -> None:
    pool = AsyncSQLitePool(settings, min_size=1, max_size=4)
    assert pool.max_size == 4
    assert pool.path == settings.sqlite_path
    await pool.close()
