import os
import tempfile
import uuid

from litestar.testing import TestClient

from src.entrypoint.app import create_app


def _client():
    # Set Turso env vars to empty string to prevent load_dotenv from loading real credentials
    os.environ["TURSO_DATABASE_URL"] = ""
    os.environ["TURSO_AUTH_TOKEN"] = ""
    os.environ.pop("SKIP_DB_INIT", None)
    db_path = os.path.join(tempfile.gettempdir(), f"test_profile_{uuid.uuid4().hex}.db")
    os.environ["SQLITE_PATH"] = db_path
    app = create_app()
    return TestClient(app)



def test_profile_endpoint() -> None:
    with _client() as client:
        response = client.get("/api/v1/debug/profile")
    assert response.status_code == 200
    data = response.json()
    assert "pool" in data
    assert "cache" in data
    assert data["pool"]["enabled"] is True
    assert "proyecto_list" in data["cache"]
    assert "proyecto_detail" in data["cache"]
    assert "user_cache" in data["cache"]


def test_profile_pool_stats() -> None:
    with _client() as client:
        response = client.get("/api/v1/debug/profile")
    data = response.json()
    assert data["pool"]["size"] >= 0
    assert data["pool"]["max_size"] >= 1
    assert data["pool"]["path"].endswith(".db")
