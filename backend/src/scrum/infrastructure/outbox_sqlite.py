from __future__ import annotations

import aiosqlite

from src.scrum.infrastructure.outbox import OutboxClient, OutboxEvent


class SqliteOutboxClient(OutboxClient):
    def __init__(self, conn: aiosqlite.Connection) -> None:
        self._conn = conn

    async def get_unprocessed_events(self, limit: int = 10) -> list[OutboxEvent]:
        cursor = await self._conn.execute(
            """SELECT id, aggregate_id, event_type, payload, occurred_at, processed_at, created_at
               FROM outbox_events
               WHERE processed_at IS NULL
               ORDER BY created_at ASC
               LIMIT ?""",
            (limit,),
        )
        rows = await cursor.fetchall()
        await cursor.close()
        return [
            OutboxEvent(
                id=row[0],
                aggregate_id=row[1],
                event_type=row[2],
                payload=row[3],
                occurred_at=row[4],
                processed_at=row[5],
                created_at=row[6],
            )
            for row in rows
        ]

    async def mark_as_processed(self, event_id: str) -> None:
        from datetime import datetime, timezone

        await self._conn.execute(
            "UPDATE outbox_events SET processed_at = ? WHERE id = ?",
            (datetime.now(timezone.utc).isoformat(), event_id),
        )
        await self._conn.commit()
