from __future__ import annotations

import os
import tempfile

import aiosqlite
import pytest

from src.scrum.domain.events import (
    HistoriaAgregada,
    HistoriaAsignadaASprint,
    ProyectoCreado,
    SprintCreado,
    SprintIniciado,
)
from src.scrum.infrastructure.outbox import OutboxEvent
from src.scrum.infrastructure.outbox_handlers import (
    LoggingHandler,
    ProjectionHandler,
    WebhookHandler,
)
from src.scrum.infrastructure.outbox_worker import OutboxWorker


class TestLoggingHandler:
    @pytest.mark.asyncio
    async def test_logs_event(self, caplog: pytest.LogCaptureFixture) -> None:
        import logging

        caplog.set_level(logging.INFO)
        handler = LoggingHandler()
        event = ProyectoCreado(proyecto_id="p1", nombre="Test")
        await handler.handle(event)
        assert "ProyectoCreado" in caplog.text
        assert "Test" in caplog.text


class TestWebhookHandler:
    @pytest.mark.asyncio
    async def test_skip_when_no_url(self, caplog: pytest.LogCaptureFixture) -> None:
        import logging

        caplog.set_level(logging.DEBUG)
        handler = WebhookHandler(url="")
        await handler.handle(ProyectoCreado(proyecto_id="p1", nombre="Test"))
        assert "no URL configured" in caplog.text

class TestProjectionHandler:
    @pytest.mark.asyncio
    async def test_insert_on_proyecto_creado(self) -> None:
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        conn = await aiosqlite.connect(path)
        conn.row_factory = aiosqlite.Row
        await conn.execute(
            "CREATE TABLE IF NOT EXISTS proyecto_read_model ("
            "proyecto_id TEXT PRIMARY KEY, nombre TEXT NOT NULL, "
            "total_historias INTEGER NOT NULL DEFAULT 0, "
            "total_story_points INTEGER NOT NULL DEFAULT 0, "
            "sprint_actual_id TEXT, sprint_actual_nombre TEXT, "
            "updated_at TEXT NOT NULL)"
        )

        handler = ProjectionHandler(conn)
        event = ProyectoCreado(proyecto_id="p1", nombre="Mi Proyecto")
        await handler.handle(event)

        cursor = await conn.execute(
            "SELECT * FROM proyecto_read_model WHERE proyecto_id = ?", ("p1",)
        )
        row = await cursor.fetchone()
        await cursor.close()
        assert row is not None
        assert row["nombre"] == "Mi Proyecto"
        assert row["total_historias"] == 0
        assert row["total_story_points"] == 0

        await conn.close()
        os.unlink(path)

    @pytest.mark.asyncio
    async def test_update_on_historia_agregada(self) -> None:
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        conn = await aiosqlite.connect(path)
        conn.row_factory = aiosqlite.Row
        await conn.execute(
            "CREATE TABLE IF NOT EXISTS proyecto_read_model ("
            "proyecto_id TEXT PRIMARY KEY, nombre TEXT NOT NULL, "
            "total_historias INTEGER NOT NULL DEFAULT 0, "
            "total_story_points INTEGER NOT NULL DEFAULT 0, "
            "sprint_actual_id TEXT, sprint_actual_nombre TEXT, "
            "updated_at TEXT NOT NULL)"
        )
        await conn.execute(
            "INSERT INTO proyecto_read_model "
            "(proyecto_id, nombre, total_historias, total_story_points, updated_at) "
            "VALUES ('p1', 'Test', 0, 0, 'now')"
        )

        handler = ProjectionHandler(conn)
        event = HistoriaAgregada(
            proyecto_id="p1", historia_id="h1", titulo="HU-1", story_points=5
        )
        await handler.handle(event)

        cursor = await conn.execute(
            "SELECT total_historias, total_story_points FROM proyecto_read_model WHERE proyecto_id = ?",
            ("p1",),
        )
        row = await cursor.fetchone()
        await cursor.close()
        assert row["total_historias"] == 1
        assert row["total_story_points"] == 5

        await conn.close()
        os.unlink(path)

    @pytest.mark.asyncio
    async def test_update_on_sprint_iniciado(self) -> None:
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        conn = await aiosqlite.connect(path)
        conn.row_factory = aiosqlite.Row
        await conn.execute(
            "CREATE TABLE IF NOT EXISTS proyecto_read_model ("
            "proyecto_id TEXT PRIMARY KEY, nombre TEXT NOT NULL, "
            "total_historias INTEGER NOT NULL DEFAULT 0, "
            "total_story_points INTEGER NOT NULL DEFAULT 0, "
            "sprint_actual_id TEXT, sprint_actual_nombre TEXT, "
            "updated_at TEXT NOT NULL)"
        )
        await conn.execute(
            "INSERT INTO proyecto_read_model "
            "(proyecto_id, nombre, total_historias, total_story_points, updated_at) "
            "VALUES ('p1', 'Test', 0, 0, 'now')"
        )

        handler = ProjectionHandler(conn)
        event = SprintIniciado(
            proyecto_id="p1",
            sprint_id="s1",
            fecha_inicio="2025-06-01T00:00:00+00:00",
        )
        await handler.handle(event)

        cursor = await conn.execute(
            "SELECT sprint_actual_id, sprint_actual_nombre FROM proyecto_read_model WHERE proyecto_id = ?",
            ("p1",),
        )
        row = await cursor.fetchone()
        await cursor.close()
        assert row["sprint_actual_id"] == "s1"

        await conn.close()
        os.unlink(path)

    @pytest.mark.asyncio
    async def test_unknown_event_does_nothing(self) -> None:
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        conn = await aiosqlite.connect(path)
        conn.row_factory = aiosqlite.Row
        await conn.execute(
            "CREATE TABLE IF NOT EXISTS proyecto_read_model ("
            "proyecto_id TEXT PRIMARY KEY, nombre TEXT NOT NULL, "
            "total_historias INTEGER NOT NULL DEFAULT 0, "
            "total_story_points INTEGER NOT NULL DEFAULT 0, "
            "sprint_actual_id TEXT, sprint_actual_nombre TEXT, "
            "updated_at TEXT NOT NULL)"
        )
        await conn.execute(
            "INSERT INTO proyecto_read_model "
            "(proyecto_id, nombre, total_historias, total_story_points, updated_at) "
            "VALUES ('p1', 'Test', 0, 0, 'now')"
        )

        handler = ProjectionHandler(conn)
        event = SprintCreado(proyecto_id="p1", sprint_id="s1", nombre="Sprint 1")
        await handler.handle(event)

        cursor = await conn.execute(
            "SELECT * FROM proyecto_read_model WHERE proyecto_id = ?", ("p1",)
        )
        row = await cursor.fetchone()
        await cursor.close()
        assert row is not None
        assert row["total_historias"] == 0

        await conn.close()
        os.unlink(path)

    @pytest.mark.asyncio
    async def test_handler_ignores_historia_asignada(self) -> None:
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        conn = await aiosqlite.connect(path)
        conn.row_factory = aiosqlite.Row
        await conn.execute(
            "CREATE TABLE IF NOT EXISTS proyecto_read_model ("
            "proyecto_id TEXT PRIMARY KEY, nombre TEXT NOT NULL, "
            "total_historias INTEGER NOT NULL DEFAULT 0, "
            "total_story_points INTEGER NOT NULL DEFAULT 0, "
            "sprint_actual_id TEXT, sprint_actual_nombre TEXT, "
            "updated_at TEXT NOT NULL)"
        )
        await conn.execute(
            "INSERT INTO proyecto_read_model "
            "(proyecto_id, nombre, total_historias, total_story_points, updated_at) "
            "VALUES ('p1', 'Test', 3, 10, 'now')"
        )

        handler = ProjectionHandler(conn)
        event = HistoriaAsignadaASprint(
            proyecto_id="p1", sprint_id="s1", historia_id="h1"
        )
        await handler.handle(event)

        cursor = await conn.execute(
            "SELECT total_historias FROM proyecto_read_model WHERE proyecto_id = ?",
            ("p1",),
        )
        row = await cursor.fetchone()
        await cursor.close()
        assert row["total_historias"] == 3

        await conn.close()
        os.unlink(path)


class TestWorkerWithHandlers:
    @pytest.mark.asyncio
    async def test_worker_calls_handlers(self) -> None:
        calls: list[str] = []

        class TrackingHandler:
            async def handle(self, event: object) -> None:
                calls.append(type(event).__name__)

        client = _make_mock_client()
        worker = OutboxWorker(
            client,
            poll_interval=0.1,
            handlers=[TrackingHandler()],  # type: ignore
        )
        await worker.start()
        import asyncio

        await asyncio.sleep(0.3)
        await worker.stop()

        assert "ProyectoCreado" in calls

    @pytest.mark.asyncio
    async def test_handler_error_does_not_crash_worker(self) -> None:
        class FailingHandler:
            async def handle(self, event: object) -> None:
                msg = "fail"
                raise RuntimeError(msg)

        client = _make_mock_client()
        worker = OutboxWorker(
            client,
            poll_interval=0.1,
            handlers=[FailingHandler()],  # type: ignore
        )
        await worker.start()
        import asyncio

        await asyncio.sleep(0.3)
        await worker.stop()
        assert "e1" in client.processed


def _make_mock_client():
    class MockOutboxClient:
        def __init__(self):
            self.events: list[OutboxEvent] = [
                OutboxEvent(
                    id="e1",
                    aggregate_id="p1",
                    event_type="proyecto.creado",
                    payload='{"proyecto_id":"p1","nombre":"Test"}',
                    occurred_at="2025-01-01T00:00:00+00:00",
                )
            ]
            self.processed: list[str] = []

        async def get_unprocessed_events(self, limit: int = 10):
            return [e for e in self.events if e.id not in self.processed][:limit]

        async def mark_as_processed(self, event_id: str):
            self.processed.append(event_id)

    return MockOutboxClient()
