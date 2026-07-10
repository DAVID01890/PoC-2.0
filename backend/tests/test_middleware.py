import os
import tempfile
import uuid

from litestar.testing import TestClient

from src.entrypoint.app import create_app


import contextlib

@contextlib.contextmanager
def _client():
    orig = {
        k: os.environ.get(k)
        for k in ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "SKIP_DB_INIT", "SQLITE_PATH", "CORS_ORIGINS"]
    }
    os.environ.pop("TURSO_DATABASE_URL", None)
    os.environ.pop("TURSO_AUTH_TOKEN", None)
    os.environ.pop("SKIP_DB_INIT", None)
    os.environ["CORS_ORIGINS"] = "*"
    db_path = os.path.join(tempfile.gettempdir(), f"test_mw_{uuid.uuid4().hex}.db")
    os.environ["SQLITE_PATH"] = db_path
    try:
        app = create_app()
        with TestClient(app) as client:
            yield client
    finally:
        for k, v in orig.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v



def _auth_headers(client: TestClient) -> dict[str, str]:
    client.post("/api/v1/auth/register", json={"name": "MW", "email": "mw@example.com", "password": "secret"})
    resp = client.post("/api/v1/auth/login", json={"email": "mw@example.com", "password": "secret"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_security_headers_on_success() -> None:
    with _client() as client:
        headers = _auth_headers(client)
        response = client.post("/api/v1/proyectos", json={"nombre": "Test"}, headers=headers)
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("x-xss-protection") == "1; mode=block"
    assert response.headers.get("referrer-policy") == "strict-origin-when-cross-origin"


def test_security_headers_on_health() -> None:
    with _client() as client:
        response = client.get("/api/v1/health")
    assert response.headers.get("x-content-type-options") == "nosniff"


def test_cors_headers_present() -> None:
    with _client() as client:
        response = client.get("/api/v1/health", headers={"Origin": "http://example.com"})
    assert response.headers.get("access-control-allow-origin") == "*"
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_preflight() -> None:
    with _client() as client:
        response = client.options(
            "/api/v1/health",
            headers={
                "Origin": "http://example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
    assert response.headers.get("access-control-allow-origin") == "*"
    assert response.headers.get("access-control-max-age") == "3600"
