from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field

import aiosqlite

from src.entrypoint.config import Settings

logger = logging.getLogger(__name__)


class AsyncSQLitePool:
    def __init__(self, settings: Settings, min_size: int = 1, max_size: int = 4) -> None:
        self._path = settings.sqlite_path
        self._min_size = min_size
        self._max_size = max_size
        self._queue: asyncio.Queue[aiosqlite.Connection] = asyncio.Queue(maxsize=max_size)
        self._created = 0
        self._lock = asyncio.Lock()
        self._closed = False

    @property
    def path(self) -> str:
        return self._path

    @property
    def size(self) -> int:
        return self._created

    @property
    def max_size(self) -> int:
        return self._max_size

    async def _create_connection(self) -> aiosqlite.Connection:
        conn = await aiosqlite.connect(self._path)
        conn.row_factory = aiosqlite.Row
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA foreign_keys=ON")
        self._created += 1
        logger.debug("Pool: created connection #%d (total=%d)", id(conn), self._created)
        return conn

    async def _fill(self) -> None:
        while self._queue.qsize() < self._min_size and self._created < self._max_size:
            conn = await self._create_connection()
            await self._queue.put(conn)

    async def acquire(self) -> aiosqlite.Connection:
        if self._closed:
            raise RuntimeError("Pool is closed")
        if self._queue.empty() and self._created < self._max_size:
            async with self._lock:
                if self._queue.empty() and self._created < self._max_size:
                    conn = await self._create_connection()
                    return conn
        conn = await self._queue.get()
        try:
            await conn.execute("SELECT 1")
        except Exception:
            logger.warning("Pool: stale connection #%d, replacing", id(conn))
            conn = await self._create_connection()
        return conn

    async def release(self, conn: aiosqlite.Connection) -> None:
        if self._closed:
            await conn.close()
            return
        try:
            await self._queue.put(conn)
        except asyncio.QueueFull:
            await conn.close()
            logger.debug("Pool: closing extra connection #%d", id(conn))

    @asynccontextmanager
    async def connection(self) -> AsyncIterator[aiosqlite.Connection]:
        conn = await self.acquire()
        try:
            yield conn
        finally:
            await self.release(conn)

    async def close(self) -> None:
        self._closed = True
        while not self._queue.empty():
            conn = self._queue.get_nowait()
            await conn.close()
        logger.info("Pool: closed (connections created: %d)", self._created)

    async def warmup(self) -> None:
        await self._fill()
        logger.info("Pool: warmed up with %d connection(s)", self._queue.qsize())


_pool_instance: AsyncSQLitePool | None = None
_pool_lock = asyncio.Lock()


async def get_pool(settings: Settings | None = None) -> AsyncSQLitePool:
    global _pool_instance
    if _pool_instance is None:
        async with _pool_lock:
            if _pool_instance is None:
                s = settings if settings is not None else Settings.from_env()
                _pool_instance = AsyncSQLitePool(s)
                await _pool_instance.warmup()
    return _pool_instance


async def close_pool() -> None:
    global _pool_instance
    if _pool_instance is not None:
        await _pool_instance.close()
        _pool_instance = None
