import asyncio
import json
import os
import tempfile
from uuid import uuid4
import pytest

from src.mcp_tools.server import mcp
import src.mcp_tools.server
from src.entrypoint.config import Settings

# Override the MCP server settings to use a temporary SQLite database during tests
db_path = os.path.join(tempfile.gettempdir(), f"test_mcp_{uuid4().hex}.db")
src.mcp_tools.server.settings = Settings(
    sqlite_path=db_path,
    turso_url="",
    turso_token="",
)


@pytest.fixture(scope="session", autouse=True)
def _init_db():
    asyncio.run(_do_init())


async def _do_init():
    from src.mcp_tools.server import _init
    await _init()


def _unique_email(prefix: str = "mcp") -> str:
    return f"{prefix}-{uuid4().hex[:8]}@test.com"


@pytest.mark.asyncio
async def test_health():
    result = await mcp.call_tool("health", {})
    data = json.loads(result[0].text)
    assert data["status"] == "ok"
    assert data["database"] == "connected"


@pytest.mark.asyncio
async def test_register_and_login():
    email = _unique_email()
    r = await mcp.call_tool("register_user", {"email": email, "password": "pass123"})
    data = json.loads(r[0].text)
    assert "id" in data
    assert data["email"] == email

    r = await mcp.call_tool("login_user", {"email": email, "password": "pass123"})
    data = json.loads(r[0].text)
    assert "access_token" in data
    assert data["token_type"] == "Bearer"


@pytest.mark.asyncio
async def test_register_duplicate():
    email = _unique_email("dup")
    await mcp.call_tool("register_user", {"email": email, "password": "pass"})
    r = await mcp.call_tool("register_user", {"email": email, "password": "pass"})
    data = json.loads(r[0].text)
    assert "error" in data


@pytest.mark.asyncio
async def test_login_invalid():
    r = await mcp.call_tool("login_user", {"email": "no-existe@x.com", "password": "x"})
    data = json.loads(r[0].text)
    assert "error" in data


@pytest.mark.asyncio
async def test_create_and_list_proyectos():
    r = await mcp.call_tool("create_proyecto", {"nombre": "MCP Test"})
    data = json.loads(r[0].text)
    assert "id" in data
    pid = data["id"]

    r = await mcp.call_tool("list_proyectos", {})
    data = json.loads(r[0].text)
    ids = [p["id"] for p in data["proyectos"]]
    assert pid in ids


@pytest.mark.asyncio
async def test_get_proyecto_not_found():
    r = await mcp.call_tool("get_proyecto", {"proyecto_id": "00000000-0000-0000-0000-000000000000"})
    data = json.loads(r[0].text)
    assert "error" in data


@pytest.mark.asyncio
async def test_full_workflow():
    r = await mcp.call_tool("create_proyecto", {"nombre": "Workflow Test"})
    pid = json.loads(r[0].text)["id"]

    r = await mcp.call_tool("add_historia", {"proyecto_id": pid, "titulo": "Task 1", "story_points": 3})
    hid = json.loads(r[0].text)["id"]

    r = await mcp.call_tool("create_sprint", {"proyecto_id": pid, "nombre": "S1"})
    sid = json.loads(r[0].text)["id"]

    r = await mcp.call_tool("assign_historia_to_sprint", {"proyecto_id": pid, "historia_id": hid, "sprint_id": sid})
    data = json.loads(r[0].text)
    assert data["status"] == "ok"

    r = await mcp.call_tool("start_sprint", {"proyecto_id": pid, "sprint_id": sid})
    data = json.loads(r[0].text)
    assert data["sprint_status"] == "active"
    assert data["fecha_inicio"] is not None

    r = await mcp.call_tool("get_proyecto", {"proyecto_id": pid})
    data = json.loads(r[0].text)
    assert data["nombre"] == "Workflow Test"
    assert len(data["sprints"]) == 1
    assert data["sprints"][0]["status"] == "active"
    assert len(data["historias"]) == 1


@pytest.mark.asyncio
async def test_create_proyecto_invalid():
    r = await mcp.call_tool("create_proyecto", {"nombre": ""})
    data = json.loads(r[0].text)
    assert "error" in data


@pytest.mark.asyncio
async def test_register_invalid_email():
    r = await mcp.call_tool("register_user", {"email": "not-an-email", "password": "x"})
    data = json.loads(r[0].text)
    assert "error" in data


@pytest.mark.asyncio
async def test_add_historia_invalid_story_points():
    r = await mcp.call_tool("add_historia", {
        "proyecto_id": "00000000-0000-0000-0000-000000000000",
        "titulo": "x",
        "story_points": -1,
    })
    data = json.loads(r[0].text)
    assert "error" in data


@pytest.mark.asyncio
async def test_create_sprint_not_found():
    r = await mcp.call_tool("create_sprint", {
        "proyecto_id": "00000000-0000-0000-0000-000000000000",
        "nombre": "S1",
    })
    data = json.loads(r[0].text)
    assert "error" in data


@pytest.mark.asyncio
async def test_start_sprint_not_found():
    r = await mcp.call_tool("start_sprint", {
        "proyecto_id": "00000000-0000-0000-0000-000000000000",
        "sprint_id": "00000000-0000-0000-0000-000000000000",
    })
    data = json.loads(r[0].text)
    assert "error" in data
