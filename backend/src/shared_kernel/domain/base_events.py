from __future__ import annotations

from datetime import datetime, timezone

from src.shared_kernel.domain.base_value_objects import EntityId


class DomainEvent:
    _event_id: EntityId
    _occurred_at: datetime

    def __init__(
        self,
        event_id: EntityId | None = None,
        occurred_at: datetime | None = None,
    ) -> None:
        self._event_id = event_id if event_id is not None else EntityId()
        self._occurred_at = (
            occurred_at if occurred_at is not None else datetime.now(timezone.utc)
        )

    @property
    def event_id(self) -> EntityId:
        return self._event_id

    @property
    def occurred_at(self) -> datetime:
        return self._occurred_at

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, DomainEvent):
            return NotImplemented
        return self._event_id == other._event_id

    def __hash__(self) -> int:
        return hash(self._event_id)

    def __str__(self) -> str:
        return f"{self.__class__.__name__}({self._event_id})"

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}"
            f"(event_id={self._event_id!r}, occurred_at={self._occurred_at!r})"
        )
