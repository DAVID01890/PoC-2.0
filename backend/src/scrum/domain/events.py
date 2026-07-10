from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from src.shared_kernel.domain.base_events import DomainEvent
from src.shared_kernel.domain.base_value_objects import EntityId


class ProyectoCreado(DomainEvent):
    event_type = "proyecto.creado"

    def __init__(
        self,
        proyecto_id: str,
        nombre: str,
        event_id: EntityId | None = None,
        occurred_at: datetime | None = None,
    ) -> None:
        super().__init__(event_id=event_id, occurred_at=occurred_at)
        self._proyecto_id = proyecto_id
        self._nombre = nombre

    @property
    def proyecto_id(self) -> str:
        return self._proyecto_id

    @property
    def nombre(self) -> str:
        return self._nombre

    def to_dict(self) -> dict[str, Any]:
        return {
            "proyecto_id": self._proyecto_id,
            "nombre": self._nombre,
        }


class HistoriaAgregada(DomainEvent):
    event_type = "proyecto.historia.agregada"

    def __init__(
        self,
        proyecto_id: str,
        historia_id: str,
        titulo: str,
        story_points: int,
        event_id: EntityId | None = None,
        occurred_at: datetime | None = None,
    ) -> None:
        super().__init__(event_id=event_id, occurred_at=occurred_at)
        self._proyecto_id = proyecto_id
        self._historia_id = historia_id
        self._titulo = titulo
        self._story_points = story_points

    @property
    def proyecto_id(self) -> str:
        return self._proyecto_id

    @property
    def historia_id(self) -> str:
        return self._historia_id

    def to_dict(self) -> dict[str, Any]:
        return {
            "proyecto_id": self._proyecto_id,
            "historia_id": self._historia_id,
            "titulo": self._titulo,
            "story_points": self._story_points,
        }


class SprintCreado(DomainEvent):
    event_type = "proyecto.sprint.creado"

    def __init__(
        self,
        proyecto_id: str,
        sprint_id: str,
        nombre: str,
        event_id: EntityId | None = None,
        occurred_at: datetime | None = None,
    ) -> None:
        super().__init__(event_id=event_id, occurred_at=occurred_at)
        self._proyecto_id = proyecto_id
        self._sprint_id = sprint_id
        self._nombre = nombre

    @property
    def proyecto_id(self) -> str:
        return self._proyecto_id

    @property
    def sprint_id(self) -> str:
        return self._sprint_id

    def to_dict(self) -> dict[str, Any]:
        return {
            "proyecto_id": self._proyecto_id,
            "sprint_id": self._sprint_id,
            "nombre": self._nombre,
        }


class SprintIniciado(DomainEvent):
    event_type = "proyecto.sprint.iniciado"

    def __init__(
        self,
        proyecto_id: str,
        sprint_id: str,
        fecha_inicio: str,
        event_id: EntityId | None = None,
        occurred_at: datetime | None = None,
    ) -> None:
        super().__init__(event_id=event_id, occurred_at=occurred_at)
        self._proyecto_id = proyecto_id
        self._sprint_id = sprint_id
        self._fecha_inicio = fecha_inicio

    @property
    def proyecto_id(self) -> str:
        return self._proyecto_id

    @property
    def sprint_id(self) -> str:
        return self._sprint_id

    def to_dict(self) -> dict[str, Any]:
        return {
            "proyecto_id": self._proyecto_id,
            "sprint_id": self._sprint_id,
            "fecha_inicio": self._fecha_inicio,
        }


class HistoriaAsignadaASprint(DomainEvent):
    event_type = "proyecto.sprint.historia_asignada"

    def __init__(
        self,
        proyecto_id: str,
        sprint_id: str,
        historia_id: str,
        event_id: EntityId | None = None,
        occurred_at: datetime | None = None,
    ) -> None:
        super().__init__(event_id=event_id, occurred_at=occurred_at)
        self._proyecto_id = proyecto_id
        self._sprint_id = sprint_id
        self._historia_id = historia_id

    @property
    def proyecto_id(self) -> str:
        return self._proyecto_id

    @property
    def sprint_id(self) -> str:
        return self._sprint_id

    @property
    def historia_id(self) -> str:
        return self._historia_id

    def to_dict(self) -> dict[str, Any]:
        return {
            "proyecto_id": self._proyecto_id,
            "sprint_id": self._sprint_id,
            "historia_id": self._historia_id,
        }


class SprintCerrado(DomainEvent):
    event_type = "proyecto.sprint.cerrado"

    def __init__(
        self,
        proyecto_id: str,
        sprint_id: str,
        fecha_fin: str,
        event_id: EntityId | None = None,
        occurred_at: datetime | None = None,
    ) -> None:
        super().__init__(event_id=event_id, occurred_at=occurred_at)
        self._proyecto_id = proyecto_id
        self._sprint_id = sprint_id
        self._fecha_fin = fecha_fin

    @property
    def proyecto_id(self) -> str:
        return self._proyecto_id

    @property
    def sprint_id(self) -> str:
        return self._sprint_id

    @property
    def fecha_fin(self) -> str:
        return self._fecha_fin

    def to_dict(self) -> dict[str, Any]:
        return {
            "proyecto_id": self._proyecto_id,
            "sprint_id": self._sprint_id,
            "fecha_fin": self._fecha_fin,
        }


class SprintReabierto(DomainEvent):
    event_type = "proyecto.sprint.reabierto"

    def __init__(
        self,
        proyecto_id: str,
        sprint_id: str,
        event_id: EntityId | None = None,
        occurred_at: datetime | None = None,
    ) -> None:
        super().__init__(event_id=event_id, occurred_at=occurred_at)
        self._proyecto_id = proyecto_id
        self._sprint_id = sprint_id

    @property
    def proyecto_id(self) -> str:
        return self._proyecto_id

    @property
    def sprint_id(self) -> str:
        return self._sprint_id

    def to_dict(self) -> dict[str, Any]:
        return {
            "proyecto_id": self._proyecto_id,
            "sprint_id": self._sprint_id,
        }

