from __future__ import annotations

import asyncio
import logging

from src.scrum.infrastructure.outbox import OutboxClient
from src.scrum.infrastructure.outbox_handlers import OutboxEventHandler
from src.shared_kernel.domain.base_events import DomainEvent

logger = logging.getLogger(__name__)


class OutboxWorker:
    def __init__(
        self,
        client: OutboxClient,
        poll_interval: float = 3.0,
        handlers: list[OutboxEventHandler] | None = None,
    ) -> None:
        self._client = client
        self._poll_interval = poll_interval
        self._handlers = handlers or []
        self._task: asyncio.Task[None] | None = None
        self._running = False

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("OutboxWorker started (poll every %ss)", self._poll_interval)

    async def stop(self) -> None:
        self._running = False
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("OutboxWorker stopped")

    async def _run_loop(self) -> None:
        while self._running:
            try:
                await self._process_batch()
            except Exception:
                logger.exception("OutboxWorker error")
            await asyncio.sleep(self._poll_interval)

    async def _process_batch(self) -> None:
        events = await self._client.get_unprocessed_events(limit=10)
        for event in events:
            try:
                domain_event = event.domain_event
                logger.info(
                    "Processing outbox event %s: %s (aggregate=%s)",
                    event.id,
                    event.event_type,
                    event.aggregate_id,
                )
                await self._handle_event(domain_event)
                await self._client.mark_as_processed(event.id)
            except Exception:
                logger.exception("Failed to process outbox event %s", event.id)

    async def _handle_event(self, event: DomainEvent) -> None:
        for handler in self._handlers:
            try:
                await handler.handle(event)
            except Exception:
                logger.exception(
                    "Handler %s failed for event %s",
                    type(handler).__name__,
                    type(event).__name__,
                )
