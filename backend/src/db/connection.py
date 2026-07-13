from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from src.db.schema import CREATE_TABLES
from src.scrum.infrastructure.schema import CREATE_INDEXES
from src.entrypoint.config import Settings


def _get_settings(settings: Settings | None = None) -> Settings:
    return settings if settings is not None else Settings.from_env()


def is_turso_enabled(settings: Settings | None = None) -> bool:
    return _get_settings(settings).is_turso_enabled


@asynccontextmanager
async def get_sqlite_connection(settings: Settings | None = None) -> AsyncIterator:
    import aiosqlite

    s = _get_settings(settings)
    async with aiosqlite.connect(s.sqlite_path) as conn:
        conn.row_factory = aiosqlite.Row
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA foreign_keys=ON")
        yield conn


@asynccontextmanager
async def get_turso_client(settings: Settings | None = None) -> AsyncIterator:
    from libsql_client import create_client

    s = _get_settings(settings)
    url = s.turso_url.replace("libsql://", "https://", 1)
    client = create_client(url=url, auth_token=s.turso_token)
    try:
        yield client
    finally:
        await client.close()


async def init_db(settings: Settings | None = None) -> None:
    import uuid
    import bcrypt

    s = _get_settings(settings)
    
    async def _seed(conn_or_client, is_turso: bool):
        import os
        if "PYTEST_CURRENT_TEST" in os.environ:
            return

        # Check if any users exist
        if is_turso:
            res = await conn_or_client.execute("SELECT COUNT(*) FROM usuarios")
            count = res.rows[0][0] if res.rows else 0
        else:
            cursor = await conn_or_client.execute("SELECT COUNT(*) FROM usuarios")
            row = await cursor.fetchone()
            count = row[0] if row else 0

        if count == 0:
            admin_id = str(uuid.uuid4())
            pw_hash = bcrypt.hashpw(s.default_admin_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            stmt = (
                "INSERT INTO usuarios (id, email, name, role, is_active, password_hash) "
                "VALUES (?, ?, ?, ?, ?, ?)"
            )
            params = (admin_id, s.default_admin_email, s.default_admin_name, "admin", 1, pw_hash)
            await conn_or_client.execute(stmt, params)
            if not is_turso:
                await conn_or_client.commit()

    import logging
    logger = logging.getLogger(__name__)

    if s.is_turso_enabled:
        async with get_turso_client(settings) as client:
            for stmt in CREATE_TABLES.split(";"):
                stmt = stmt.strip()
                if stmt:
                    await client.execute(stmt)
            try:
                await client.execute("ALTER TABLE proyectos ADD COLUMN descripcion TEXT")
            except Exception as e:
                logger.debug("Migration 'add descripcion column' skipped on Turso: %s", e)
            try:
                await client.execute("ALTER TABLE historias ADD COLUMN asignado_a TEXT")
            except Exception as e:
                logger.debug("Migration 'add asignado_a column' skipped on Turso: %s", e)
            # Crear índices para mejorar rendimiento de queries
            for stmt in CREATE_INDEXES.strip().split(";"):
                stmt = stmt.strip()
                if stmt:
                    try:
                        await client.execute(stmt)
                    except Exception as e:
                        logger.debug("Index creation skipped on Turso: %s", e)
            await _seed(client, is_turso=True)
    else:
        async with get_sqlite_connection(settings) as conn:
            await conn.executescript(CREATE_TABLES)
            await conn.commit()
            try:
                await conn.execute("ALTER TABLE proyectos ADD COLUMN descripcion TEXT")
                await conn.commit()
            except Exception as e:
                logger.debug("Migration 'add descripcion column' skipped on SQLite: %s", e)
            try:
                await conn.execute("ALTER TABLE historias ADD COLUMN asignado_a TEXT")
                await conn.commit()
            except Exception as e:
                logger.debug("Migration 'add asignado_a column' skipped on SQLite: %s", e)
            # Crear índices para mejorar rendimiento de queries
            await conn.executescript(CREATE_INDEXES)
            await conn.commit()
            await _seed(conn, is_turso=False)
