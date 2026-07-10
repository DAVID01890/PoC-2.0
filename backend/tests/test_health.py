import os

from litestar.testing import TestClient

from src.entrypoint.app import create_app


def test_health_returns_200() -> None:
    os.environ["SKIP_DB_INIT"] = "1"
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
