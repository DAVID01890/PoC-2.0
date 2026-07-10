from __future__ import annotations

import logging
from uuid import UUID

from litestar.connection import ASGIConnection
from litestar.exceptions import HTTPException
from litestar.handlers.base import BaseRouteHandler
from litestar.security.jwt import JWTAuth
from litestar.security.jwt.token import Token

import os
from pathlib import Path
from dotenv import load_dotenv

from src.entrypoint.auth.config import AuthSettings
from src.shared_kernel.infrastructure.cache import TTLCache

logger = logging.getLogger(__name__)

# Cargar .env de la raíz del proyecto
env_path = Path(__file__).parents[4] / ".env"
load_dotenv(env_path)

settings = AuthSettings.from_env()

# Caché de usuarios: almacena dicts en lugar de entidades de dominio
_user_cache: TTLCache[dict] = TTLCache[dict](ttl_seconds=30.0, maxsize=256)


async def retrieve_user_handler(token: Token, connection: ASGIConnection) -> dict | None:
    """Recupera el usuario autenticado como dict. Resuelve caches y fachadas desde app.state."""
    user_id = str(token.sub)
    cache = connection.app.state.user_cache

    cached = await cache.get(user_id)
    if cached is not None:
        logger.debug("Cache hit for user %s", user_id)
        return cached

    facade = connection.app.state.idp
    user = await facade.get_user(user_id)
    if user is not None:
        await cache.set(user_id, user)
    return user


jwt_auth = JWTAuth(
    retrieve_user_handler=retrieve_user_handler,
    token_secret=settings.secret,
    exclude=[
        "/api/v1/health",
        "/api/v1/debug/profile",
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/schema",
    ],
)


async def require_active_user(
    connection: ASGIConnection,
    handler: BaseRouteHandler,
) -> None:
    user: dict | None = connection.user
    if user is None or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Unauthorized")
