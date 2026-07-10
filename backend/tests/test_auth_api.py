import os
import tempfile
import uuid

from litestar.testing import TestClient

from src.entrypoint.app import create_app


def _client():
    os.environ.pop("TURSO_DATABASE_URL", None)
    os.environ.pop("TURSO_AUTH_TOKEN", None)
    os.environ.pop("SKIP_DB_INIT", None)
    db_path = os.path.join(tempfile.gettempdir(), f"test_auth_{uuid.uuid4().hex}.db")
    os.environ["SQLITE_PATH"] = db_path
    app = create_app()
    return TestClient(app)


def test_register_success() -> None:
    with _client() as client:
        response = client.post("/api/v1/auth/register", json={"name": "New User", "email": "new@example.com", "password": "pass123"})
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "new@example.com"


def test_register_duplicate_email() -> None:
    with _client() as client:
        client.post("/api/v1/auth/register", json={"name": "Dup", "email": "dup@example.com", "password": "pass123"})
        response = client.post("/api/v1/auth/register", json={"name": "Dup2", "email": "dup@example.com", "password": "other456"})
    assert response.status_code == 409
    assert "ya está registrado" in response.json()["detail"]


def test_register_invalid_email() -> None:
    with _client() as client:
        response = client.post("/api/v1/auth/register", json={"name": "Bad", "email": "not-an-email", "password": "pass123"})
    assert response.status_code == 400


def test_login_success() -> None:
    with _client() as client:
        client.post("/api/v1/auth/register", json={"name": "Login", "email": "login@example.com", "password": "secret123"})
        response = client.post("/api/v1/auth/login", json={"email": "login@example.com", "password": "secret123"})
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "user" in data


def test_login_wrong_password() -> None:
    with _client() as client:
        client.post("/api/v1/auth/register", json={"name": "WP", "email": "wp@example.com", "password": "correct"})
        response = client.post("/api/v1/auth/login", json={"email": "wp@example.com", "password": "wrong"})
    assert response.status_code == 401


def test_login_nonexistent_user() -> None:
    with _client() as client:
        response = client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "anything"})
    assert response.status_code == 401


def test_login_invalid_email_format() -> None:
    with _client() as client:
        response = client.post("/api/v1/auth/login", json={"email": "bad", "password": "x"})
    assert response.status_code == 400


def test_protected_route_without_token() -> None:
    with _client() as client:
        response = client.get("/api/v1/proyectos")
    assert response.status_code == 401


def test_protected_route_with_invalid_token() -> None:
    with _client() as client:
        headers = {"Authorization": "Bearer invalid.jwt.token"}
        response = client.get("/api/v1/proyectos", headers=headers)
    assert response.status_code == 401


def test_health_is_public() -> None:
    with _client() as client:
        response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "database" in data


def test_auth_routes_are_public() -> None:
    with _client() as client:
        reg = client.post("/api/v1/auth/register", json={"name": "Pub", "email": "pub@example.com", "password": "x"})
        log = client.post("/api/v1/auth/login", json={"email": "pub@example.com", "password": "x"})
    assert reg.status_code == 201
    assert log.status_code == 201

def test_me_returns_current_user() -> None:
    with _client() as client:
        reg = client.post("/api/v1/auth/register", json={"name": "Me Test", "email": "me@example.com", "password": "secret123"})
        assert reg.status_code == 201
        token = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        me = client.get("/api/v1/auth/me", headers=headers)
        assert me.status_code == 200
        data = me.json()
        assert data["email"] == "me@example.com"
        assert data["name"] == "Me Test"
        assert data["role"] == "developer"
