from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from litestar import Litestar, Router, get
from litestar.connection import ASGIConnection
from litestar.config.app import AppConfig
from litestar.config.cors import CORSConfig
from litestar.di import Provide
from litestar.openapi.config import OpenAPIConfig

from src.entrypoint.auth import auth_router, usuarios_router
from src.entrypoint.auth.guards import jwt_auth
from src.entrypoint.config import Settings
from src.entrypoint.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware
from src.entrypoint.scrum import scrum_router
from src.entrypoint.ai import ai_router


API_PREFIX = "/api/v1"


@get("/health", tags=["health"])
async def health(settings: Settings) -> dict[str, str]:
    try:
        if settings.is_turso_enabled:
            from libsql_client import create_client
            url = settings.turso_url.replace("libsql://", "https://", 1)
            client = create_client(url=url, auth_token=settings.turso_token)
            await client.execute("SELECT 1")
            await client.close()
        else:
            from src.db.pool import get_pool as _get_pool
            pool = await _get_pool(settings)
            async with pool.connection() as conn:
                await conn.execute("SELECT 1")
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "degraded", "database": str(e)}


@get("/debug/profile", exclude_from_auth=True, tags=["debug"])
async def profile(request: ASGIConnection) -> dict[str, object]:
    pool = request.app.state.pool
    proyecto_list_cache = request.app.state.proyecto_list_cache
    user_cache = request.app.state.user_cache

    pool_stats: dict[str, object] = {"enabled": False}
    if pool is not None:
        pool_stats = {
            "enabled": True,
            "size": pool.size,
            "max_size": pool.max_size,
            "path": pool.path,
        }

    return {
        "pool": pool_stats,
        "cache": {
            "proyecto_list": proyecto_list_cache.stats(),
            "proyecto_detail": request.app.state.proyecto_detail_cache.stats(),
            "user_cache": user_cache.stats(),
        },
    }


# Los repositorios y dependencias se instancian en la etapa de lifespan y se acceden vía app.state.


def _build_lifespan(settings: Settings):
    @asynccontextmanager
    async def lifespan(app: Litestar) -> AsyncGenerator[None, None]:
        # Inicializar caches en app.state
        from src.shared_kernel.infrastructure.cache import TTLCache
        app.state.user_cache = TTLCache[dict](ttl_seconds=30.0, maxsize=256)
        app.state.proyecto_list_cache = TTLCache[list](ttl_seconds=15.0, maxsize=1)
        app.state.proyecto_detail_cache = TTLCache[object](ttl_seconds=15.0, maxsize=64)

        if not settings.skip_db_init:
            from src.db.connection import init_db
            await init_db(settings)

        pool = None
        conn = None
        client = None
        if not settings.is_turso_enabled:
            from src.db.pool import get_pool as _get_pool
            pool = await _get_pool(settings)
        app.state.pool = pool

        # Instanciar repositorios usando los caches del app.state si corresponde
        if settings.is_turso_enabled:
            from src.scrum.adapters.proyecto_repo_turso import ProyectoRepositorioTurso
            from src.idp.adapters.usuario_repo_turso import UsuarioRepositorioTurso
            app.state.proyecto_repo = ProyectoRepositorioTurso(settings)
            app.state.usuario_repo = UsuarioRepositorioTurso(settings)
        else:
            from src.scrum.adapters.proyecto_repo_sqlite import ProyectoRepositorySQLite
            from src.idp.adapters.usuario_repo_sqlite import UsuarioRepositorySQLite
            app.state.proyecto_repo = ProyectoRepositorySQLite(
                pool=pool,
                list_cache=app.state.proyecto_list_cache,
                detail_cache=app.state.proyecto_detail_cache,
            )
            app.state.usuario_repo = UsuarioRepositorySQLite(pool=pool)

        # Instanciar fachadas modulares expuestas
        from src.idp import IDPFacade
        from src.scrum import ScrumFacade
        app.state.idp = IDPFacade(app.state.usuario_repo)
        app.state.scrum = ScrumFacade(app.state.proyecto_repo)

        if settings.is_turso_enabled:
            from libsql_client import create_client
            from src.scrum.infrastructure.outbox_turso import TursoOutboxClient
            url = settings.turso_url.replace("libsql://", "https://", 1)
            client = create_client(url=url, auth_token=settings.turso_token)
            outbox_client = TursoOutboxClient(client)
        else:
            from src.scrum.infrastructure.outbox_sqlite import SqliteOutboxClient
            conn = await pool.acquire()
            outbox_client = SqliteOutboxClient(conn)

        from src.scrum.infrastructure.outbox_handlers import (
            LoggingHandler,
            ProjectionHandler,
            WebhookHandler,
        )
        from src.scrum.infrastructure.outbox_worker import OutboxWorker

        handlers: list = [LoggingHandler()]
        if settings.outbox_webhook_url:
            handlers.append(WebhookHandler(settings.outbox_webhook_url))
        if client is not None:
            handlers.append(ProjectionHandler(client))
        elif conn is not None:
            handlers.append(ProjectionHandler(conn))

        worker = OutboxWorker(outbox_client, handlers=handlers)
        await worker.start()
        try:
            yield
        finally:
            await worker.stop()
            if client is not None:
                await client.close()
            if conn is not None:
                await pool.release(conn)
            if pool is not None:
                from src.db.pool import close_pool
                await close_pool()

    return lifespan


def _on_app_init(app_config: AppConfig) -> AppConfig:
    import os
    env_file = None if "PYTEST_CURRENT_TEST" in os.environ else str(Path(__file__).parents[3] / ".env")
    settings = Settings.from_env(env_file)

    from litestar.datastructures import State
    def get_pool(state: State):
        return state.pool

    def get_proyecto_repo(state: State):
        return state.proyecto_repo

    def get_usuario_repo_dep(state: State):
        return state.usuario_repo

    def get_idp(state: State):
        return state.idp

    def get_scrum(state: State):
        return state.scrum

    app_config.dependencies["settings"] = Provide(lambda: settings, use_cache=True, sync_to_thread=False)
    app_config.dependencies["pool"] = Provide(get_pool, use_cache=True, sync_to_thread=False)
    app_config.dependencies["proyecto_repo"] = Provide(get_proyecto_repo, use_cache=True, sync_to_thread=False)
    app_config.dependencies["usuario_repo"] = Provide(get_usuario_repo_dep, use_cache=True, sync_to_thread=False)
    app_config.dependencies["idp"] = Provide(get_idp, use_cache=True, sync_to_thread=False)
    app_config.dependencies["scrum"] = Provide(get_scrum, use_cache=True, sync_to_thread=False)
    app_config.lifespan.append(_build_lifespan(settings))
    return app_config


def create_app() -> Litestar:
    settings = Settings.from_env()
    cors_config = CORSConfig(
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "Accept"],
        max_age=3600,
    )
    api_router = Router(
        path=API_PREFIX,
        route_handlers=[
            health,
            profile,
            auth_router,
            usuarios_router,
            scrum_router,
            ai_router,
        ],
    )
    openapi_config = OpenAPIConfig(
        title=settings.api_title,
        version=settings.api_version,
        description=(
            "API RESTful para gestión de proyectos Scrum. "
            "Permite administrar proyectos, sprints, historias de usuario, "
            "tareas técnicas y miembros del equipo."
        ),
    )
    return Litestar(
        cors_config=cors_config,
        route_handlers=[api_router],
        on_app_init=[_on_app_init, jwt_auth.on_app_init],
        middleware=[RequestLoggingMiddleware, SecurityHeadersMiddleware],
        openapi_config=openapi_config,
    )
