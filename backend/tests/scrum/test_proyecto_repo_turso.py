import os

import pytest
from src.db.connection import is_turso_enabled

if not is_turso_enabled() or os.environ.get("RUN_TURSO_TESTS") != "1":
    pytest.skip("Skipping Turso tests to prevent wiping the active database. Set RUN_TURSO_TESTS=1 to run them.", allow_module_level=True)

pytest.importorskip("libsql_client")

import pytest_asyncio

from src.db.connection import init_db, get_turso_client
from src.scrum.adapters.proyecto_repo_turso import ProyectoRepositorioTurso
from src.scrum.domain.entities import (
    HistoriaDeUsuario,
    Proyecto,
    ProyectoId,
    SprintStatus,
)
from src.scrum.domain.value_objects import StoryPoint
from src.shared_kernel.domain.base_value_objects import NotEmptyString


@pytest_asyncio.fixture
async def setup_db():
    try:
        await init_db()
    except Exception as e:
        pytest.skip(f"Turso connection failed: {e}")
    yield
    if is_turso_enabled():
        try:
            async with get_turso_client() as client:
                await client.execute("DROP TABLE IF EXISTS tareas_tecnicas")
                await client.execute("DROP TABLE IF EXISTS proyecto_miembros")
                await client.execute("DROP TABLE IF EXISTS outbox_events")
                await client.execute("DROP TABLE IF EXISTS proyecto_read_model")
                await client.execute("DROP TABLE IF EXISTS historias")
                await client.execute("DROP TABLE IF EXISTS sprints")
                await client.execute("DROP TABLE IF EXISTS usuarios")
                await client.execute("DROP TABLE IF EXISTS proyectos")
        except Exception:
            pass




@pytest.mark.asyncio
async def test_save_and_find_by_id(setup_db) -> None:
    repo = ProyectoRepositorioTurso()
    proyecto = Proyecto(nombre=NotEmptyString("Test Project"))

    historia = HistoriaDeUsuario(
        title=NotEmptyString("Feature 1"),
        story_points=StoryPoint(5),
    )
    proyecto.add_historia(historia)
    sprint = proyecto.create_sprint(nombre=NotEmptyString("Sprint 1"))
    sprint.start()
    proyecto.add_historia_to_sprint(historia.id, sprint.id)

    await repo.save(proyecto)

    loaded = await repo.find_by_id(proyecto.id)
    assert loaded is not None
    assert loaded.nombre == proyecto.nombre
    assert len(loaded.sprints) == 1
    assert len(loaded.historias) == 1
    sprint_loaded = loaded.get_sprint(sprint.id)
    assert sprint_loaded.status == SprintStatus.ACTIVE
    assert historia.id in sprint_loaded.backlog


@pytest.mark.asyncio
async def test_find_nonexistent_returns_none(setup_db) -> None:
    repo = ProyectoRepositorioTurso()
    result = await repo.find_by_id(ProyectoId())
    assert result is None


@pytest.mark.asyncio
async def test_delete(setup_db) -> None:
    repo = ProyectoRepositorioTurso()
    proyecto = Proyecto(nombre=NotEmptyString("To Delete"))
    await repo.save(proyecto)
    await repo.delete(proyecto.id)
    result = await repo.find_by_id(proyecto.id)
    assert result is None
