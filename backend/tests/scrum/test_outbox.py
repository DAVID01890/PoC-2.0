from __future__ import annotations

import json
import os
import tempfile

import aiosqlite
import pytest

from src.scrum.adapters.proyecto_repo_sqlite import ProyectoRepositorySQLite
from src.scrum.domain.entities import (
    HistoriaDeUsuario,
    Proyecto,
)
from src.scrum.domain.events import (
    HistoriaAgregada,
    HistoriaAsignadaASprint,
    ProyectoCreado,
    SprintCreado,
    SprintIniciado,
)
from src.scrum.domain.value_objects import StoryPoint
from src.scrum.infrastructure.outbox import OutboxEvent, deserialize_event, serialize_event
from src.scrum.infrastructure.outbox_sqlite import SqliteOutboxClient
from src.scrum.infrastructure.outbox_worker import OutboxWorker
from src.shared_kernel.domain.base_value_objects import NotEmptyString


class TestEventSerialization:
    def test_serialize_creates_unique_ids(self):
        e1_data = serialize_event(ProyectoCreado(proyecto_id="1", nombre="Test"))
        e2_data = serialize_event(ProyectoCreado(proyecto_id="1", nombre="Test"))
        assert e1_data[0] != e2_data[0]

    def test_roundtrip_proyecto_creado(self):
        original = ProyectoCreado(proyecto_id="abc-123", nombre="Mi Proyecto")
        event_id, event_type, payload, occurred_at, _ = serialize_event(original)
        restored = deserialize_event(event_id, event_type, payload, occurred_at)
        assert restored.event_type == "proyecto.creado"
        assert restored.to_dict() == original.to_dict()

    def test_roundtrip_historia_agregada(self):
        original = HistoriaAgregada(
            proyecto_id="p1", historia_id="h1", titulo="Tarea", story_points=5
        )
        event_id, event_type, payload, occurred_at, _ = serialize_event(original)
        restored = deserialize_event(event_id, event_type, payload, occurred_at)
        assert restored.event_type == "proyecto.historia.agregada"
        assert restored.to_dict() == original.to_dict()

    def test_roundtrip_sprint_creado(self):
        original = SprintCreado(proyecto_id="p1", sprint_id="s1", nombre="Sprint 1")
        event_id, event_type, payload, occurred_at, _ = serialize_event(original)
        restored = deserialize_event(event_id, event_type, payload, occurred_at)
        assert restored.event_type == "proyecto.sprint.creado"
        assert restored.to_dict() == original.to_dict()

    def test_roundtrip_sprint_iniciado(self):
        original = SprintIniciado(
            proyecto_id="p1", sprint_id="s1", fecha_inicio="2025-01-01T00:00:00+00:00"
        )
        event_id, event_type, payload, occurred_at, _ = serialize_event(original)
        restored = deserialize_event(event_id, event_type, payload, occurred_at)
        assert restored.event_type == "proyecto.sprint.iniciado"
        assert restored.to_dict() == original.to_dict()

    def test_roundtrip_historia_asignada(self):
        original = HistoriaAsignadaASprint(
            proyecto_id="p1", sprint_id="s1", historia_id="h1"
        )
        event_id, event_type, payload, occurred_at, _ = serialize_event(original)
        restored = deserialize_event(event_id, event_type, payload, occurred_at)
        assert restored.event_type == "proyecto.sprint.historia_asignada"
        assert restored.to_dict() == original.to_dict()


async def _init_db(path: str) -> None:
    from src.db.schema import CREATE_TABLES

    conn = await aiosqlite.connect(path)
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA journal_mode=WAL")
    await conn.execute("PRAGMA foreign_keys=ON")
    await conn.executescript(CREATE_TABLES)
    await conn.commit()
    await conn.close()


async def _fetch_outbox(path: str) -> list[dict]:
    conn = await aiosqlite.connect(path)
    conn.row_factory = aiosqlite.Row
    cursor = await conn.execute(
        "SELECT aggregate_id, event_type, payload, occurred_at, processed_at, created_at "
        "FROM outbox_events ORDER BY created_at"
    )
    rows = await cursor.fetchall()
    await cursor.close()
    await conn.close()
    return [dict(r) for r in rows]


def _setup_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.environ["SQLITE_PATH"] = path
    return path


def _teardown_db(path):
    os.unlink(path)


@pytest.mark.asyncio
async def test_create_proyecto_generates_creado_event():
    path = _setup_db()
    await _init_db(path)

    repo = ProyectoRepositorySQLite()
    proyecto = Proyecto.create(nombre=NotEmptyString("Test"))
    await repo.save(proyecto)

    rows = await _fetch_outbox(path)
    assert len(rows) == 1
    assert rows[0]["aggregate_id"] == str(proyecto.id)
    assert rows[0]["event_type"] == "proyecto.creado"
    payload = json.loads(rows[0]["payload"])
    assert payload["nombre"] == "Test"
    assert payload["proyecto_id"] == str(proyecto.id)
    _teardown_db(path)


@pytest.mark.asyncio
async def test_add_historia_generates_event():
    path = _setup_db()
    await _init_db(path)

    repo = ProyectoRepositorySQLite()
    proyecto = Proyecto.create(nombre=NotEmptyString("Test"))
    await repo.save(proyecto)
    proyecto.add_historia(
        HistoriaDeUsuario(
            title=NotEmptyString("HU-1"),
            story_points=StoryPoint(3),
        )
    )
    await repo.save(proyecto)

    rows = await _fetch_outbox(path)
    types = [r["event_type"] for r in rows]
    assert types == ["proyecto.creado", "proyecto.historia.agregada"]
    _teardown_db(path)


@pytest.mark.asyncio
async def test_create_sprint_generates_event():
    path = _setup_db()
    await _init_db(path)

    repo = ProyectoRepositorySQLite()
    proyecto = Proyecto.create(nombre=NotEmptyString("Test"))
    await repo.save(proyecto)
    proyecto.create_sprint(nombre=NotEmptyString("Sprint 1"))
    await repo.save(proyecto)

    rows = await _fetch_outbox(path)
    types = [r["event_type"] for r in rows]
    assert "proyecto.sprint.creado" in types
    _teardown_db(path)


@pytest.mark.asyncio
async def test_assign_historia_to_sprint_generates_event():
    path = _setup_db()
    await _init_db(path)

    repo = ProyectoRepositorySQLite()
    proyecto = Proyecto.create(nombre=NotEmptyString("Test"))
    sprint = proyecto.create_sprint(nombre=NotEmptyString("Sprint 1"))
    historia = HistoriaDeUsuario(
        title=NotEmptyString("HU-1"),
        story_points=StoryPoint(3),
    )
    proyecto.add_historia(historia)
    await repo.save(proyecto)
    proyecto.add_historia_to_sprint(historia.id, sprint.id)
    await repo.save(proyecto)

    rows = await _fetch_outbox(path)
    types = [r["event_type"] for r in rows]
    assert "proyecto.sprint.historia_asignada" in types
    _teardown_db(path)


@pytest.mark.asyncio
async def test_start_sprint_generates_event():
    path = _setup_db()
    await _init_db(path)

    repo = ProyectoRepositorySQLite()
    proyecto = Proyecto.create(nombre=NotEmptyString("Test"))
    sprint = proyecto.create_sprint(nombre=NotEmptyString("Sprint 1"))
    await repo.save(proyecto)
    proyecto.start_sprint(sprint.id)
    await repo.save(proyecto)

    rows = await _fetch_outbox(path)
    types = [r["event_type"] for r in rows]
    assert "proyecto.sprint.iniciado" in types
    _teardown_db(path)


@pytest.mark.asyncio
async def test_pull_domain_events_clears_list():
    path = _setup_db()
    await _init_db(path)

    repo = ProyectoRepositorySQLite()
    proyecto = Proyecto.create(nombre=NotEmptyString("Test"))
    await repo.save(proyecto)
    assert len(proyecto.pull_domain_events()) == 0
    _teardown_db(path)


@pytest.mark.asyncio
async def test_save_only_persists_new_events():
    path = _setup_db()
    await _init_db(path)

    repo = ProyectoRepositorySQLite()
    proyecto = Proyecto.create(nombre=NotEmptyString("Test"))
    await repo.save(proyecto)

    rows1 = await _fetch_outbox(path)
    first_count = len(rows1)

    await repo.save(proyecto)

    rows2 = await _fetch_outbox(path)
    assert len(rows2) == first_count
    _teardown_db(path)


@pytest.mark.asyncio
async def test_get_unprocessed_events():
    path = _setup_db()
    await _init_db(path)

    conn = await aiosqlite.connect(path)
    conn.row_factory = aiosqlite.Row
    await conn.execute(
        "INSERT INTO outbox_events "
        "(id, aggregate_id, event_type, payload, occurred_at, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (
            "e1",
            "p1",
            "proyecto.creado",
            '{"proyecto_id":"p1","nombre":"Test"}',
            "2025-01-01T00:00:00+00:00",
            "2025-01-01T00:00:00+00:00",
        ),
    )
    await conn.commit()

    client = SqliteOutboxClient(conn)
    events = await client.get_unprocessed_events()

    assert len(events) == 1
    assert events[0].id == "e1"
    assert events[0].aggregate_id == "p1"
    assert events[0].processed_at is None

    await conn.close()
    _teardown_db(path)


@pytest.mark.asyncio
async def test_mark_as_processed():
    path = _setup_db()
    await _init_db(path)

    conn = await aiosqlite.connect(path)
    conn.row_factory = aiosqlite.Row
    await conn.execute(
        "INSERT INTO outbox_events "
        "(id, aggregate_id, event_type, payload, occurred_at, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        ("e1", "p1", "proyecto.creado", "{}", "now", "now"),
    )
    await conn.commit()

    client = SqliteOutboxClient(conn)
    await client.mark_as_processed("e1")

    cursor = await conn.execute(
        "SELECT processed_at FROM outbox_events WHERE id = ?", ("e1",)
    )
    row = await cursor.fetchone()
    await cursor.close()
    assert row["processed_at"] is not None

    await conn.close()
    _teardown_db(path)


@pytest.mark.asyncio
async def test_processed_events_not_returned():
    path = _setup_db()
    await _init_db(path)

    conn = await aiosqlite.connect(path)
    conn.row_factory = aiosqlite.Row
    await conn.execute(
        "INSERT INTO outbox_events "
        "(id, aggregate_id, event_type, payload, occurred_at, created_at, "
        "processed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ("e1", "p1", "proyecto.creado", "{}", "now", "now", "2025-01-01T00:00:00+00:00"),
    )
    await conn.commit()

    client = SqliteOutboxClient(conn)
    events = await client.get_unprocessed_events()
    assert len(events) == 0

    await conn.close()
    _teardown_db(path)


class MockOutboxClient:
    def __init__(self):
        self.events: list[OutboxEvent] = []
        self.processed: list[str] = []

    async def get_unprocessed_events(self, limit: int = 10):
        return [e for e in self.events if e.id not in self.processed][:limit]

    async def mark_as_processed(self, event_id: str):
        self.processed.append(event_id)


@pytest.mark.asyncio
async def test_worker_processes_events():
    client = MockOutboxClient()
    event = OutboxEvent(
        id="e1",
        aggregate_id="p1",
        event_type="proyecto.creado",
        payload='{"proyecto_id":"p1","nombre":"Test"}',
        occurred_at="2025-01-01T00:00:00+00:00",
    )
    client.events.append(event)

    worker = OutboxWorker(client, poll_interval=0.1)
    await worker.start()
    import asyncio

    await asyncio.sleep(0.3)
    await worker.stop()

    assert "e1" in client.processed


@pytest.mark.asyncio
async def test_worker_no_events_does_not_error():
    client = MockOutboxClient()
    worker = OutboxWorker(client, poll_interval=0.1)
    await worker.start()
    import asyncio

    await asyncio.sleep(0.2)
    await worker.stop()
