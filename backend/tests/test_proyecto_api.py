import os
import tempfile
import uuid

from litestar.testing import TestClient

from src.entrypoint.app import create_app

PREFIX = "/api/v1"


def _auth_headers(client: TestClient) -> dict[str, str]:
    client.post(f"{PREFIX}/auth/register", json={"name": "Test", "email": "test@example.com", "password": "secret123"})
    resp = client.post(f"{PREFIX}/auth/login", json={"email": "test@example.com", "password": "secret123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _client():
    os.environ.pop("TURSO_DATABASE_URL", None)
    os.environ.pop("TURSO_AUTH_TOKEN", None)
    os.environ.pop("SKIP_DB_INIT", None)
    db_path = os.path.join(tempfile.gettempdir(), f"test_proyectos_{uuid.uuid4().hex}.db")
    os.environ["SQLITE_PATH"] = db_path
    app = create_app()
    return TestClient(app)


def test_create_proyecto() -> None:
    with _client() as client:
        headers = _auth_headers(client)
        response = client.post(f"{PREFIX}/proyectos", json={"nombre": "Mi Proyecto"}, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == "Mi Proyecto"
    assert "id" in data


def test_get_proyecto() -> None:
    with _client() as client:
        headers = _auth_headers(client)
        created = client.post(f"{PREFIX}/proyectos", json={"nombre": "Test"}, headers=headers).json()
        response = client.get(f"{PREFIX}/proyectos/{created['id']}", headers=headers)
    assert response.status_code == 200
    assert response.json()["nombre"] == "Test"


def test_get_nonexistent_proyecto() -> None:
    with _client() as client:
        headers = _auth_headers(client)
        response = client.get(f"{PREFIX}/proyectos/00000000-0000-0000-0000-000000000000", headers=headers)
    assert response.status_code == 404


def test_delete_proyecto() -> None:
    with _client() as client:
        headers = _auth_headers(client)
        created = client.post(f"{PREFIX}/proyectos", json={"nombre": "To Delete"}, headers=headers).json()
        delete_resp = client.delete(f"{PREFIX}/proyectos/{created['id']}", headers=headers)
        get_resp = client.get(f"{PREFIX}/proyectos/{created['id']}", headers=headers)
    assert delete_resp.status_code == 200
    assert get_resp.status_code == 404


def test_create_proyecto_with_invalid_nombre() -> None:
    with _client() as client:
        headers = _auth_headers(client)
        response = client.post(f"{PREFIX}/proyectos", json={"nombre": ""}, headers=headers)
    assert response.status_code == 400


def test_add_historia() -> None:
    with _client() as client:
        headers = _auth_headers(client)
        proyecto = client.post(f"{PREFIX}/proyectos", json={"nombre": "P"}, headers=headers).json()
        response = client.post(
            f"{PREFIX}/proyectos/{proyecto['id']}/historias",
            json={"titulo": "Feature 1", "story_points": 5},
            headers=headers,
        )
    assert response.status_code == 201
    data = response.json()
    assert len(data["historias"]) == 1
    assert data["historias"][0]["titulo"] == "Feature 1"


def test_create_sprint() -> None:
    with _client() as client:
        headers = _auth_headers(client)
        proyecto = client.post(f"{PREFIX}/proyectos", json={"nombre": "P"}, headers=headers).json()
        
        # Test default creation
        response = client.post(
            f"{PREFIX}/proyectos/{proyecto['id']}/sprints",
            json={"nombre": "Sprint 1"},
            headers=headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert len(data["sprints"]) == 1
        assert data["sprints"][0]["nombre"] == "Sprint 1"
        assert data["sprints"][0]["fecha_inicio"] is None
        assert data["sprints"][0]["fecha_fin"] is None

        # Test creation with start/end dates
        response_dates = client.post(
            f"{PREFIX}/proyectos/{proyecto['id']}/sprints",
            json={
                "nombre": "Sprint 2",
                "fecha_inicio": "2026-07-10T00:00:00Z",
                "fecha_fin": "2026-07-24T00:00:00Z"
            },
            headers=headers,
        )
        assert response_dates.status_code == 201
        data_dates = response_dates.json()
        # Find sprint 2 in response
        sprint2 = next(s for s in data_dates["sprints"] if s["nombre"] == "Sprint 2")
        assert sprint2["fecha_inicio"] == "2026-07-10T00:00:00+00:00"
        assert sprint2["fecha_fin"] == "2026-07-24T00:00:00+00:00"


def test_add_historia_to_sprint() -> None:
    with _client() as client:
        headers = _auth_headers(client)
        proyecto = client.post(f"{PREFIX}/proyectos", json={"nombre": "P"}, headers=headers).json()
        historia = client.post(
            f"{PREFIX}/proyectos/{proyecto['id']}/historias",
            json={"titulo": "H", "story_points": 3},
            headers=headers,
        ).json()
        sprint = client.post(
            f"{PREFIX}/proyectos/{proyecto['id']}/sprints",
            json={"nombre": "S1"},
            headers=headers,
        ).json()
        response = client.post(
            f"{PREFIX}/proyectos/{proyecto['id']}/sprints/historias",
            json={
                "historia_id": historia["historias"][0]["id"],
                "sprint_id": sprint["sprints"][0]["id"],
            },
            headers=headers,
        )
    assert response.status_code == 201
    sprint_data = response.json()["sprints"][0]
    assert len(sprint_data["backlog"]) == 1


def test_start_sprint() -> None:
    with _client() as client:
        headers = _auth_headers(client)
        proyecto = client.post(f"{PREFIX}/proyectos", json={"nombre": "P"}, headers=headers).json()
        sprint = client.post(
            f"{PREFIX}/proyectos/{proyecto['id']}/sprints",
            json={"nombre": "S1"},
            headers=headers,
        ).json()
        sprint_id = sprint["sprints"][0]["id"]
        response = client.post(
            f"{PREFIX}/proyectos/{proyecto['id']}/sprints/{sprint_id}/start",
            headers=headers,
        )
    assert response.status_code == 201
    sprint_data = response.json()["sprints"][0]
    assert sprint_data["status"] == "active"
    assert sprint_data["fecha_inicio"] is not None
