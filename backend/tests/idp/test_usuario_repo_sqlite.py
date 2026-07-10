import os
import tempfile
import uuid
import pytest

pytest.importorskip("aiosqlite")

import pytest_asyncio

# Force using a temporary database path for these tests to avoid conflicts
os.environ["SQLITE_PATH"] = os.path.join(tempfile.gettempdir(), f"test_users_{uuid.uuid4().hex}.db")

from src.db.connection import get_sqlite_connection
from src.db.schema import CREATE_TABLES
from src.idp.adapters.usuario_repo_sqlite import UsuarioRepositorySQLite
from src.idp.domain.entities import Usuario
from src.idp.domain.value_objects import UserId, UserRole
from src.shared_kernel.domain.base_value_objects import Email, NotEmptyString


@pytest_asyncio.fixture
async def setup_db():
    async with get_sqlite_connection() as conn:
        await conn.executescript(CREATE_TABLES)
        await conn.commit()
    yield
    async with get_sqlite_connection() as conn:
        await conn.executescript("DROP TABLE IF EXISTS usuarios")
        await conn.commit()


@pytest.mark.asyncio
async def test_save_and_find_by_id(setup_db) -> None:
    repo = UsuarioRepositorySQLite()
    user = Usuario(
        email=Email("alice@example.com"),
        name=NotEmptyString("Alice"),
        role=UserRole.DEVELOPER,
    )
    await repo.save(user)
    loaded = await repo.find_by_id(user.id)
    assert loaded is not None
    assert loaded.email == user.email
    assert loaded.name == user.name
    assert loaded.role == UserRole.DEVELOPER
    assert loaded.is_active is True


@pytest.mark.asyncio
async def test_find_by_email(setup_db) -> None:
    repo = UsuarioRepositorySQLite()
    user = Usuario(
        email=Email("bob@example.com"),
        name=NotEmptyString("Bob"),
    )
    await repo.save(user)
    loaded = await repo.find_by_email(Email("bob@example.com"))
    assert loaded is not None
    assert loaded.id == user.id


@pytest.mark.asyncio
async def test_find_by_email_nonexistent(setup_db) -> None:
    repo = UsuarioRepositorySQLite()
    result = await repo.find_by_email(Email("nobody@example.com"))
    assert result is None


@pytest.mark.asyncio
async def test_find_nonexistent_returns_none(setup_db) -> None:
    repo = UsuarioRepositorySQLite()
    result = await repo.find_by_id(UserId())
    assert result is None


@pytest.mark.asyncio
async def test_list(setup_db) -> None:
    repo = UsuarioRepositorySQLite()
    await repo.save(
        Usuario(email=Email("a@example.com"), name=NotEmptyString("A"))
    )
    await repo.save(
        Usuario(email=Email("b@example.com"), name=NotEmptyString("B"))
    )
    users = await repo.list()
    assert len(users) == 2


@pytest.mark.asyncio
async def test_list_empty(setup_db) -> None:
    repo = UsuarioRepositorySQLite()
    users = await repo.list()
    assert users == []


@pytest.mark.asyncio
async def test_delete(setup_db) -> None:
    repo = UsuarioRepositorySQLite()
    user = Usuario(
        email=Email("to-delete@example.com"),
        name=NotEmptyString("To Delete"),
    )
    await repo.save(user)
    await repo.delete(user.id)
    loaded = await repo.find_by_id(user.id)
    assert loaded is None


@pytest.mark.asyncio
async def test_save_persists_role_and_active_status(setup_db) -> None:
    repo = UsuarioRepositorySQLite()
    user = Usuario(
        email=Email("admin@example.com"),
        name=NotEmptyString("Admin"),
        role=UserRole.ADMIN,
        is_active=False,
    )
    await repo.save(user)
    loaded = await repo.find_by_id(user.id)
    assert loaded is not None
    assert loaded.role == UserRole.ADMIN
    assert loaded.is_active is False
