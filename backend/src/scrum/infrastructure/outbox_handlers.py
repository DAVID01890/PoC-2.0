from __future__ import annotations

import json
import logging
import os
from abc import ABC, abstractmethod
from typing import Any

from src.shared_kernel.domain.base_events import DomainEvent

logger = logging.getLogger(__name__)


class OutboxEventHandler(ABC):
    @abstractmethod
    async def handle(self, event: DomainEvent) -> None: ...


class LoggingHandler(OutboxEventHandler):
    async def handle(self, event: DomainEvent) -> None:
        logger.info(
            "[EventHandler] %s | data=%s",
            type(event).__name__,
            json.dumps(event.to_dict(), default=str),
        )


class WebhookHandler(OutboxEventHandler):
    def __init__(self, url: str | None = None) -> None:
        self._url = url or os.getenv("OUTBOX_WEBHOOK_URL", "")

    async def handle(self, event: DomainEvent) -> None:
        if not self._url:
            logger.debug("WebhookHandler: no URL configured, skipping")
            return
        import httpx

        payload: dict[str, Any] = {
            "event_type": getattr(event, "event_type", type(event).__name__),
            "data": event.to_dict(),
            "occurred_at": event.occurred_at.isoformat(),
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(self._url, json=payload, timeout=5.0)
            resp.raise_for_status()
        logger.info("WebhookHandler: sent %s → %s", type(event).__name__, self._url)


class ProjectionHandler(OutboxEventHandler):
    def __init__(self, conn: Any) -> None:
        self._conn = conn

    async def handle(self, event: DomainEvent) -> None:
        event_type = getattr(event, "event_type", "")
        data = event.to_dict()
        now = event.occurred_at.isoformat()

        if event_type == "proyecto.creado":
            await self._conn.execute(
                "INSERT OR IGNORE INTO proyecto_read_model "
                "(proyecto_id, nombre, total_historias, total_story_points, updated_at) "
                "VALUES (?, ?, 0, 0, ?)",
                (data["proyecto_id"], data["nombre"], now),
            )

        elif event_type == "proyecto.historia.agregada":
            await self._conn.execute(
                "UPDATE proyecto_read_model SET "
                "total_historias = total_historias + 1, "
                "total_story_points = total_story_points + ?, "
                "updated_at = ? "
                "WHERE proyecto_id = ?",
                (data["story_points"], now, data["proyecto_id"]),
            )

        elif event_type == "proyecto.sprint.iniciado":
            await self._conn.execute(
                "UPDATE proyecto_read_model SET "
                "sprint_actual_id = ?, "
                "sprint_actual_nombre = ?, "
                "updated_at = ? "
                "WHERE proyecto_id = ?",
                (data["sprint_id"], data["fecha_inicio"], now, data["proyecto_id"]),
            )

        if hasattr(self._conn, "commit"):
            await self._conn.commit()
