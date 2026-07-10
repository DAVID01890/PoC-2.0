import pytest

pytest.importorskip("aiosqlite")

import pytest_asyncio

from src.db.connection import get_sqlite_connection
from src.db.schema import CREATE_TABLES
from src.scrum.adapters.proyecto_repo_sqlite import ProyectoRepositorySQLite
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
    async with get_sqlite_connection() as conn:
        await conn.executescript(CREATE_TABLES)
        await conn.commit()
    yield
    async with get_sqlite_connection() as conn:
        await conn.executescript(
            "DROP TABLE IF EXISTS tareas_tecnicas;"
            "DROP TABLE IF EXISTS historias;"
            "DROP TABLE IF EXISTS sprints;"
            "DROP TABLE IF EXISTS proyectos;"
        )
        await conn.commit()


@pytest.mark.asyncio
async def test_save_and_find_by_id(setup_db) -> None:
    repo = ProyectoRepositorySQLite()
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
    repo = ProyectoRepositorySQLite()
    result = await repo.find_by_id(ProyectoId())
    assert result is None


@pytest.mark.asyncio
async def test_delete(setup_db) -> None:
    repo = ProyectoRepositorySQLite()
    proyecto = Proyecto(nombre=NotEmptyString("To Delete"))
    await repo.save(proyecto)
    await repo.delete(proyecto.id)
    result = await repo.find_by_id(proyecto.id)
    assert result is None
