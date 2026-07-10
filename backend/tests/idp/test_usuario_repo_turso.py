import os

import pytest
from src.db.connection import is_turso_enabled

if not is_turso_enabled() or os.environ.get("RUN_TURSO_TESTS") != "1":
    pytest.skip("Skipping Turso tests to prevent wiping the active database. Set RUN_TURSO_TESTS=1 to run them.", allow_module_level=True)

pytest.importorskip("libsql_client")

import pytest_asyncio

from src.db.connection import init_db, get_turso_client
from src.idp.adapters.usuario_repo_turso import UsuarioRepositorioTurso
from src.idp.domain.entities import Usuario
from src.idp.domain.value_objects import UserId, UserRole
from src.shared_kernel.domain.base_value_objects import Email, NotEmptyString


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
    repo = UsuarioRepositorioTurso()
    user = Usuario(
        email=Email("alice@turso.com"),
        name=NotEmptyString("Alice"),
        role=UserRole.DEVELOPER,
    )
    user.set_password("secret123")
    await repo.save(user)
    loaded = await repo.find_by_id(user.id)
    assert loaded is not None
    assert loaded.email == user.email
    assert loaded.name == user.name
    assert loaded.role == UserRole.DEVELOPER
    assert loaded.is_active is True
    assert loaded.password_hash is not None


@pytest.mark.asyncio
async def test_find_by_email(setup_db) -> None:
    repo = UsuarioRepositorioTurso()
    user = Usuario(
        email=Email("bob@turso.com"),
        name=NotEmptyString("Bob"),
    )
    await repo.save(user)
    loaded = await repo.find_by_email(Email("bob@turso.com"))
    assert loaded is not None
    assert loaded.id == user.id


@pytest.mark.asyncio
async def test_find_by_email_nonexistent(setup_db) -> None:
    repo = UsuarioRepositorioTurso()
    result = await repo.find_by_email(Email("nobody@turso.com"))
    assert result is None


@pytest.mark.asyncio
async def test_find_nonexistent_returns_none(setup_db) -> None:
    repo = UsuarioRepositorioTurso()
    result = await repo.find_by_id(UserId())
    assert result is None


@pytest.mark.asyncio
async def test_list(setup_db) -> None:
    repo = UsuarioRepositorioTurso()
    await repo.save(
        Usuario(email=Email("a@turso.com"), name=NotEmptyString("A"))
    )
    await repo.save(
        Usuario(email=Email("b@turso.com"), name=NotEmptyString("B"))
    )
    users = await repo.list()
    assert len(users) == 2


@pytest.mark.asyncio
async def test_list_empty(setup_db) -> None:
    repo = UsuarioRepositorioTurso()
    users = await repo.list()
    assert users == []


@pytest.mark.asyncio
async def test_delete(setup_db) -> None:
    repo = UsuarioRepositorioTurso()
    user = Usuario(
        email=Email("delete@turso.com"),
        name=NotEmptyString("To Delete"),
    )
    await repo.save(user)
    await repo.delete(user.id)
    loaded = await repo.find_by_id(user.id)
    assert loaded is None


@pytest.mark.asyncio
async def test_save_persists_role_and_active_status(setup_db) -> None:
    repo = UsuarioRepositorioTurso()
    user = Usuario(
        email=Email("admin@turso.com"),
        name=NotEmptyString("Admin"),
        role=UserRole.ADMIN,
        is_active=False,
    )
    await repo.save(user)
    loaded = await repo.find_by_id(user.id)
    assert loaded is not None
    assert loaded.role == UserRole.ADMIN
    assert loaded.is_active is False


@pytest.mark.asyncio
async def test_save_persists_password_hash(setup_db) -> None:
    repo = UsuarioRepositorioTurso()
    user = Usuario(
        email=Email("pw@turso.com"),
        name=NotEmptyString("PW"),
    )
    user.set_password("my-password")
    await repo.save(user)
    loaded = await repo.find_by_id(user.id)
    assert loaded is not None
    assert loaded.password_hash is not None
    assert loaded.password_hash != ""
    assert loaded.verify_password("my-password") is True
    assert loaded.verify_password("wrong") is False
