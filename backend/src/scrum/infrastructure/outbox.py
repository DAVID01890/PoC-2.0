from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from src.scrum.domain.events import (
    HistoriaAgregada,
    HistoriaAsignadaASprint,
    ProyectoCreado,
    SprintCerrado,
    SprintCreado,
    SprintIniciado,
)
from src.shared_kernel.domain.base_events import DomainEvent

_EVENT_CLASSES: dict[str, type[DomainEvent]] = {
    "proyecto.creado": ProyectoCreado,
    "proyecto.historia.agregada": HistoriaAgregada,
    "proyecto.sprint.creado": SprintCreado,
    "proyecto.sprint.iniciado": SprintIniciado,
    "proyecto.sprint.cerrado": SprintCerrado,
    "proyecto.sprint.historia_asignada": HistoriaAsignadaASprint,
}

_EVENT_TYPES: dict[type[DomainEvent], str] = {
    v: k for k, v in _EVENT_CLASSES.items()
}


def serialize_event(event: DomainEvent) -> tuple[str, str, str, str]:
    event_id = str(uuid4())
    event_type = _EVENT_TYPES.get(type(event))
    if event_type is None:
        raise ValueError(f"Unknown event class: {type(event)}")
    payload = json.dumps(event.to_dict(), default=str)
    occurred_at = event.occurred_at.isoformat()
    created_at = datetime.now(timezone.utc).isoformat()
    return event_id, event_type, payload, occurred_at, created_at


def deserialize_event(
    event_id: str,
    event_type: str,
    payload: str,
    occurred_at: str,
) -> DomainEvent:
    cls = _EVENT_CLASSES.get(event_type)
    if cls is None:
        raise ValueError(f"Unknown event type: {event_type}")
    data = json.loads(payload)
    return cls(**data, event_id=event_id, occurred_at=datetime.fromisoformat(occurred_at))


@dataclass
class OutboxEvent:
    id: str
    aggregate_id: str
    event_type: str
    payload: str
    occurred_at: str
    processed_at: str | None = None
    created_at: str = ""

    @property
    def domain_event(self) -> DomainEvent:
        return deserialize_event(
            self.id, self.event_type, self.payload, self.occurred_at
        )


class OutboxClient(ABC):
    @abstractmethod
    async def get_unprocessed_events(self, limit: int = 10) -> list[OutboxEvent]: ...

    @abstractmethod
    async def mark_as_processed(self, event_id: str) -> None: ...
