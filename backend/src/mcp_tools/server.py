"""MCP server for PoC Planner — expone las herramientas del dominio a través de fachadas."""
from __future__ import annotations

import sys

from mcp.server.fastmcp import FastMCP

from src.entrypoint.config import Settings
from src.idp import IDPFacade
from src.scrum import ScrumFacade

mcp = FastMCP("PoC Planner", host="0.0.0.0", port=8101)
settings = Settings.from_env()
_db_initialized = False


async def _get_pool():
    from src.db.pool import get_pool
    return await get_pool(settings)


async def _ensure_pool():
    if not settings.is_turso_enabled:
        await _get_pool()


async def _init():
    global _db_initialized
    await _ensure_pool()
    if _db_initialized:
        return
    from src.db.connection import init_db
    await init_db(settings)
    _db_initialized = True


def _get_proyecto_repo():
    if settings.is_turso_enabled:
        from src.scrum.adapters.proyecto_repo_turso import ProyectoRepositorioTurso
        return ProyectoRepositorioTurso(settings)
    from src.scrum.adapters.proyecto_repo_sqlite import ProyectoRepositorySQLite
    from src.db.pool import get_pool as _pool_fn
    # Nota: en MCP el pool debe estar ya inicializado
    from src.db.pool import _pool_instance
    return ProyectoRepositorySQLite(pool=_pool_instance)


def _get_usuario_repo():
    if settings.is_turso_enabled:
        from src.idp.adapters.usuario_repo_turso import UsuarioRepositorioTurso
        return UsuarioRepositorioTurso(settings)
    from src.idp.adapters.usuario_repo_sqlite import UsuarioRepositorySQLite
    from src.db.pool import _pool_instance
    return UsuarioRepositorySQLite(pool=_pool_instance)


# ------------------------------------------------------------------
# Health
# ------------------------------------------------------------------

@mcp.tool()
async def health() -> dict:
    """Verifica que la base de datos responde."""
    try:
        await _init()
        if settings.is_turso_enabled:
            from libsql_client import create_client
            url = settings.turso_url.replace("libsql://", "https://", 1)
            client = create_client(url=url, auth_token=settings.turso_token)
            await client.execute("SELECT 1")
            await client.close()
        else:
            pool = await _get_pool()
            async with pool.connection() as conn:
                await conn.execute("SELECT 1")
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        return {"status": "degraded", "database": str(exc)}


# ------------------------------------------------------------------
# Usuarios (IDPFacade)
# ------------------------------------------------------------------

@mcp.tool()
async def register_user(email: str, password: str) -> dict:
    """Registra un nuevo usuario en el sistema."""
    await _init()
    facade = IDPFacade(_get_usuario_repo())
    try:
        user = await facade.register_user(
            email=email,
            name=email.split("@")[0],
            password=password,
        )
        return {"id": user["id"], "email": user["email"]}
    except Exception as exc:
        return {"error": str(exc)}


@mcp.tool()
async def login_user(email: str, password: str) -> dict:
    """Autentica un usuario y devuelve un token JWT."""
    await _init()
    facade = IDPFacade(_get_usuario_repo())
    user = await facade.authenticate(email, password)
    if user is None:
        return {"error": "Credenciales invalidas"}

    from litestar.security.jwt import JWTAuth
    secret = settings.jwt_secret or "test-secret-only-for-mcp-server-testing-do-not-use-in-prod"
    token = JWTAuth(
        retrieve_user_handler=lambda t, c: None,
        token_secret=secret,
    ).create_token(identifier=user["id"])
    return {"access_token": token, "token_type": "Bearer"}


# ------------------------------------------------------------------
# Proyectos (ScrumFacade)
# ------------------------------------------------------------------

@mcp.tool()
async def create_proyecto(nombre: str) -> dict:
    """Crea un nuevo proyecto."""
    await _init()
    scrum = ScrumFacade(_get_proyecto_repo())
    try:
        result = await scrum.create_proyecto(nombre=nombre)
        return {"id": result["id"], "nombre": result["nombre"]}
    except Exception as exc:
        return {"error": str(exc)}


@mcp.tool()
async def list_proyectos() -> dict:
    """Lista todos los proyectos."""
    await _ensure_pool()
    scrum = ScrumFacade(_get_proyecto_repo())
    proyectos = await scrum.list_proyectos()
    return {"proyectos": [{"id": p["id"], "nombre": p["nombre"]} for p in proyectos]}


@mcp.tool()
async def get_proyecto(proyecto_id: str) -> dict:
    """Obtiene un proyecto con sus sprints e historias."""
    await _ensure_pool()
    scrum = ScrumFacade(_get_proyecto_repo())
    proyecto = await scrum.get_proyecto(proyecto_id)
    if proyecto is None:
        return {"error": "Proyecto no encontrado"}
    return {
        "id": proyecto["id"],
        "nombre": proyecto["nombre"],
        "sprints": [
            {"id": s["id"], "nombre": s["nombre"], "status": s["status"]}
            for s in proyecto["sprints"]
        ],
        "historias": [
            {"id": h["id"], "titulo": h["titulo"], "story_points": h["story_points"], "status": h["status"]}
            for h in proyecto["historias"]
        ],
    }


@mcp.tool()
async def add_historia(proyecto_id: str, titulo: str, story_points: int) -> dict:
    """Agrega una historia de usuario a un proyecto."""
    await _init()
    scrum = ScrumFacade(_get_proyecto_repo())
    try:
        result = await scrum.add_historia(proyecto_id, titulo, story_points)
        if result is None:
            return {"error": "Proyecto no encontrado"}
        # Retornar la última historia agregada
        historias = result["historias"]
        nueva = next((h for h in historias if h["titulo"] == titulo), historias[-1])
        return {"id": nueva["id"], "titulo": titulo, "story_points": story_points}
    except Exception as exc:
        return {"error": str(exc)}


@mcp.tool()
async def create_sprint(
    proyecto_id: str,
    nombre: str,
    fecha_inicio: str | None = None,
    fecha_fin: str | None = None,
) -> dict:
    """Crea un sprint en un proyecto."""
    await _init()
    scrum = ScrumFacade(_get_proyecto_repo())
    try:
        dt_inicio = datetime.fromisoformat(fecha_inicio) if fecha_inicio else None
        dt_fin = datetime.fromisoformat(fecha_fin) if fecha_fin else None
        result = await scrum.create_sprint(
            proyecto_id, nombre, fecha_inicio=dt_inicio, fecha_fin=dt_fin
        )
        if result is None:
            return {"error": "Proyecto no encontrado"}
        sprints = result["sprints"]
        nuevo = next((s for s in sprints if s["nombre"] == nombre), sprints[-1])
        return {"id": nuevo["id"], "nombre": nombre, "status": nuevo["status"]}
    except Exception as exc:
        return {"error": str(exc)}


@mcp.tool()
async def assign_historia_to_sprint(
    proyecto_id: str, historia_id: str, sprint_id: str
) -> dict:
    """Asigna una historia de usuario a un sprint."""
    await _init()
    scrum = ScrumFacade(_get_proyecto_repo())
    try:
        result = await scrum.add_historia_to_sprint(proyecto_id, sprint_id, historia_id)
        if result is None:
            return {"error": "Proyecto no encontrado"}
        return {"status": "ok", "historia": historia_id, "sprint": sprint_id}
    except Exception as exc:
        return {"error": str(exc)}


@mcp.tool()
async def start_sprint(proyecto_id: str, sprint_id: str) -> dict:
    """Inicia un sprint (lo pasa de planned a active)."""
    await _init()
    scrum = ScrumFacade(_get_proyecto_repo())
    try:
        result = await scrum.update_sprint_status(proyecto_id, sprint_id, "active")
        if result is None:
            return {"error": "Proyecto no encontrado"}
        sprint = next((s for s in result["sprints"] if s["id"] == sprint_id), None)
        return {
            "status": "ok",
            "sprint_status": sprint["status"] if sprint else "active",
            "fecha_inicio": sprint.get("fecha_inicio") if sprint else None,
        }
    except Exception as exc:
        return {"error": str(exc)}


if __name__ == "__main__":
    transport = sys.argv[1] if len(sys.argv) > 1 else "stdio"
    mcp.run(transport=transport)
