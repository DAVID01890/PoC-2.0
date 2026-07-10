from __future__ import annotations

from datetime import datetime, timezone

from src.scrum.infrastructure.outbox import OutboxClient, OutboxEvent


class TursoOutboxClient(OutboxClient):
    def __init__(self, client: object) -> None:
        self._client = client

    async def get_unprocessed_events(self, limit: int = 10) -> list[OutboxEvent]:
        result = await self._client.execute(
            "SELECT id, aggregate_id, event_type, payload, occurred_at, processed_at, "
            "created_at FROM outbox_events WHERE processed_at IS NULL "
            "ORDER BY created_at ASC LIMIT ?",
            (limit,),
        )
        rows = result.rows if hasattr(result, "rows") else result.response.result.rows
        events: list[OutboxEvent] = []
        for row in rows:
            try:
                event_id = row["id"]
            except (KeyError, IndexError, TypeError):
                continue
            try:
                processed_at = row["processed_at"]
            except (KeyError, IndexError, TypeError):
                processed_at = None
            events.append(
                OutboxEvent(
                    id=event_id,
                    aggregate_id=row["aggregate_id"],
                    event_type=row["event_type"],
                    payload=row["payload"],
                    occurred_at=row["occurred_at"],
                    processed_at=processed_at,
                    created_at=row["created_at"],
                )
            )
        return events

    async def mark_as_processed(self, event_id: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        stmts: list[tuple[str, tuple]] = [
            (
                "UPDATE outbox_events SET processed_at = ? WHERE id = ?",
                (now, event_id),
            )
        ]
        await self._client.batch(stmts)
