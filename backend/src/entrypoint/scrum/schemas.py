from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID


@dataclass
class CreateProyectoRequest:
    nombre: str
    descripcion: str = ""


@dataclass
class UpdateProyectoRequest:
    nombre: str
    descripcion: str


@dataclass
class CreateHistoriaRequest:
    titulo: str
    story_points: int
    descripcion: str | None = None
    asignado_a: str | list[str] | None = None


@dataclass
class UpdateHistoriaRequest:
    titulo: str | None = None
    descripcion: str | None = None
    story_points: int | None = None
    asignado_a: str | list[str] | None = None


@dataclass
class CreateSprintRequest:
    nombre: str


@dataclass
class UpdateSprintRequest:
    nombre: str


@dataclass
class AddHistoriaToSprintRequest:
    historia_id: str
    sprint_id: str


@dataclass
class HistoriaResponse:
    id: str
    titulo: str
    descripcion: str | None
    story_points: int
    status: str
    asignado_a: str | None = None
    asignados: list[str] | None = None


@dataclass
class SprintResponse:
    id: str
    nombre: str
    status: str
    fecha_inicio: str | None
    fecha_fin: str | None
    backlog: list[str]


@dataclass
class CreateTareaRequest:
    titulo: str
    estimated_hours: int
    descripcion: str | None = None


@dataclass
class UpdateTareaRequest:
    titulo: str | None = None
    descripcion: str | None = None
    estimated_hours: int | None = None


@dataclass
class TareaResponse:
    id: str
    historia_id: str
    titulo: str
    descripcion: str | None
    estimated_hours: int
    status: str


@dataclass
class AddMiembroRequest:
    usuario_id: str
    rol: str


@dataclass
class ProyectoResponse:
    id: str
    nombre: str
    descripcion: str = ""
    sprints: list[SprintResponse] = field(default_factory=list)
    historias: list[HistoriaResponse] = field(default_factory=list)
    tareas: list[TareaResponse] = field(default_factory=list)
    miembros: dict[str, str] = field(default_factory=dict)


@dataclass
class UpdateStatusRequest:
    status: str

