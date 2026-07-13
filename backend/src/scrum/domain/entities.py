from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from src.scrum.domain.value_objects import HorasEstimadas, StoryPoint
from src.shared_kernel.domain.base_exceptions import BusinessRuleError, NotFoundError
from src.scrum.domain.events import (
    HistoriaAgregada,
    HistoriaAsignadaASprint,
    ProyectoCreado,
    SprintCerrado,
    SprintCreado,
    SprintIniciado,
    SprintReabierto,
)
from src.shared_kernel.domain.base_events import DomainEvent
from src.shared_kernel.domain.base_value_objects import EntityId, NotEmptyString


class HistoriaId(EntityId):
    pass


class HistoriaStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class HistoriaDeUsuario:
    _id: HistoriaId
    _title: NotEmptyString
    _description: str | None
    _story_points: StoryPoint
    _status: HistoriaStatus
    _asignado_a: str | None

    def __init__(
        self,
        title: NotEmptyString,
        story_points: StoryPoint,
        description: str | None = None,
        status: HistoriaStatus = HistoriaStatus.PENDING,
        id: HistoriaId | None = None,
        asignado_a: str | list[str] | None = None,
    ) -> None:
        self._id = id if id is not None else HistoriaId()
        self._title = title
        self._description = description
        self._story_points = story_points
        self._status = status
        if isinstance(asignado_a, list):
            self._asignado_a = ",".join([x.strip() for x in asignado_a if x.strip()]) if any(x.strip() for x in asignado_a) else None
        else:
            self._asignado_a = asignado_a if asignado_a and asignado_a.strip() else None

    @property
    def id(self) -> HistoriaId:
        return self._id

    @property
    def title(self) -> NotEmptyString:
        return self._title

    @property
    def description(self) -> str | None:
        return self._description

    @property
    def story_points(self) -> StoryPoint:
        return self._story_points

    @property
    def status(self) -> HistoriaStatus:
        return self._status

    @property
    def asignado_a(self) -> str | None:
        return self._asignado_a

    @property
    def asignados(self) -> list[str]:
        if not self._asignado_a:
            return []
        return [x.strip() for x in self._asignado_a.split(",") if x.strip()]

    def start_work(self) -> None:
        if self._status != HistoriaStatus.PENDING:
            raise BusinessRuleError(
                f"Cannot start work on a {self._status.value} historia"
            )
        self._status = HistoriaStatus.IN_PROGRESS

    def complete(self) -> None:
        if self._status != HistoriaStatus.IN_PROGRESS:
            raise BusinessRuleError(
                f"Cannot complete a {self._status.value} historia"
            )
        self._status = HistoriaStatus.DONE

    def update_details(
        self,
        titulo: NotEmptyString | None = None,
        descripcion: str | None = None,
        story_points: StoryPoint | None = None,
        asignado_a: str | list[str] | None = None,
        clear_asignado: bool = False,
    ) -> None:
        if titulo is not None:
            self._title = titulo
        if descripcion is not None:
            self._description = descripcion
        if story_points is not None:
            self._story_points = story_points
        if clear_asignado:
            self._asignado_a = None
        elif asignado_a is not None:
            if isinstance(asignado_a, list):
                self._asignado_a = ",".join([x.strip() for x in asignado_a if x.strip()]) if any(x.strip() for x in asignado_a) else None
            else:
                self._asignado_a = asignado_a if asignado_a.strip() else None

    def update_status(self, new_status: HistoriaStatus) -> None:
        self._status = new_status

    def reopen(self) -> None:
        if self._status != HistoriaStatus.DONE:
            raise BusinessRuleError(
                f"Cannot reopen a {self._status.value} historia"
            )
        self._status = HistoriaStatus.PENDING

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, HistoriaDeUsuario):
            return NotImplemented
        return self._id == other._id

    def __hash__(self) -> int:
        return hash(self._id)

    def __str__(self) -> str:
        return f"HistoriaDeUsuario({self._id}, {self._title})"

    def __repr__(self) -> str:
        return (
            f"HistoriaDeUsuario("
            f"id={self._id!r}, "
            f"title={self._title!r}, "
            f"points={self._story_points!r}, "
            f"asignado_a={self._asignado_a!r})"
        )


class TareaTecnicaId(EntityId):
    pass


class TareaTecnicaStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class TareaTecnica:
    _id: TareaTecnicaId
    _historia_id: HistoriaId
    _title: NotEmptyString
    _description: str | None
    _estimated_hours: HorasEstimadas
    _status: TareaTecnicaStatus

    def __init__(
        self,
        historia_id: HistoriaId,
        title: NotEmptyString,
        estimated_hours: HorasEstimadas,
        description: str | None = None,
        status: TareaTecnicaStatus = TareaTecnicaStatus.PENDING,
        id: TareaTecnicaId | None = None,
    ) -> None:
        self._id = id if id is not None else TareaTecnicaId()
        self._historia_id = historia_id
        self._title = title
        self._description = description
        self._estimated_hours = estimated_hours
        self._status = status

    @property
    def id(self) -> TareaTecnicaId:
        return self._id

    @property
    def historia_id(self) -> HistoriaId:
        return self._historia_id

    @property
    def title(self) -> NotEmptyString:
        return self._title

    @property
    def description(self) -> str | None:
        return self._description

    @property
    def estimated_hours(self) -> HorasEstimadas:
        return self._estimated_hours

    @property
    def status(self) -> TareaTecnicaStatus:
        return self._status

    def start_work(self) -> None:
        if self._status != TareaTecnicaStatus.PENDING:
            raise BusinessRuleError(
                f"Cannot start work on a {self._status.value} tarea"
            )
        self._status = TareaTecnicaStatus.IN_PROGRESS

    def complete(self) -> None:
        if self._status != TareaTecnicaStatus.IN_PROGRESS:
            raise BusinessRuleError(
                f"Cannot complete a {self._status.value} tarea"
            )
        self._status = TareaTecnicaStatus.DONE

    def update(
        self,
        titulo: NotEmptyString | None = None,
        descripcion: str | None = None,
        estimated_hours: HorasEstimadas | None = None,
    ) -> None:
        if titulo is not None:
            self._title = titulo
        if descripcion is not None:
            self._description = descripcion if descripcion else None
        if estimated_hours is not None:
            self._estimated_hours = estimated_hours

    def update_status(self, new_status: TareaTecnicaStatus) -> None:
        if new_status == TareaTecnicaStatus.IN_PROGRESS:
            self.start_work()
        elif new_status == TareaTecnicaStatus.DONE:
            self.complete()
        else:
            self._status = new_status

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, TareaTecnica):
            return NotImplemented
        return self._id == other._id

    def __hash__(self) -> int:
        return hash(self._id)

    def __str__(self) -> str:
        return f"TareaTecnica({self._id}, {self._title})"

    def __repr__(self) -> str:
        return (
            f"TareaTecnica("
            f"id={self._id!r}, "
            f"historia_id={self._historia_id!r}, "
            f"title={self._title!r})"
        )


class SprintId(EntityId):
    pass


class SprintStatus(Enum):
    PLANNED = "planned"
    ACTIVE = "active"
    CLOSED = "closed"


class Sprint:
    _id: SprintId
    _nombre: NotEmptyString
    _fecha_inicio: datetime | None
    _fecha_fin: datetime | None
    _status: SprintStatus
    _backlog: list[HistoriaId]

    def __init__(
        self,
        nombre: NotEmptyString,
        status: SprintStatus = SprintStatus.PLANNED,
        fecha_inicio: datetime | None = None,
        fecha_fin: datetime | None = None,
        id: SprintId | None = None,
    ) -> None:
        self._id = id if id is not None else SprintId()
        self._nombre = nombre
        self._fecha_inicio = fecha_inicio
        self._fecha_fin = fecha_fin
        self._status = status
        self._backlog = []

    @property
    def id(self) -> SprintId:
        return self._id

    @property
    def nombre(self) -> NotEmptyString:
        return self._nombre

    @property
    def fecha_inicio(self) -> datetime | None:
        return self._fecha_inicio

    @property
    def fecha_fin(self) -> datetime | None:
        return self._fecha_fin

    @property
    def status(self) -> SprintStatus:
        return self._status

    @property
    def backlog(self) -> list[HistoriaId]:
        return list(self._backlog)

    def start(self, fecha_inicio: datetime | None = None) -> None:
        if self._status is not SprintStatus.PLANNED:
            raise BusinessRuleError(
                f"Cannot start a {self._status.value} sprint"
            )
        self._status = SprintStatus.ACTIVE
        self._fecha_inicio = (
            fecha_inicio if fecha_inicio is not None else datetime.now(timezone.utc)
        )

    def close(self, fecha_fin: datetime | None = None) -> None:
        if self._status is not SprintStatus.ACTIVE:
            raise BusinessRuleError(
                f"Cannot close a {self._status.value} sprint"
            )
        self._status = SprintStatus.CLOSED
        self._fecha_fin = (
            fecha_fin if fecha_fin is not None else datetime.now(timezone.utc)
        )

    def reopen(self) -> None:
        if self._status is not SprintStatus.CLOSED:
            raise BusinessRuleError(
                f"Cannot reopen a {self._status.value} sprint"
            )
        self._status = SprintStatus.PLANNED
        self._fecha_fin = None

    def update_status(self, new_status: SprintStatus) -> None:
        if new_status == SprintStatus.ACTIVE and self._status == SprintStatus.PLANNED:
            self.start()
        elif new_status == SprintStatus.CLOSED and self._status == SprintStatus.ACTIVE:
            self.close()
        elif new_status == SprintStatus.PLANNED and self._status == SprintStatus.CLOSED:
            self.reopen()
        else:
            self._status = new_status

    def set_fechas(self, fecha_inicio: datetime | None = None, fecha_fin: datetime | None = None) -> None:
        if fecha_inicio is not None:
            self._fecha_inicio = fecha_inicio
        if fecha_fin is not None:
            self._fecha_fin = fecha_fin

    def rename(self, nuevo_nombre: NotEmptyString) -> None:
        """Cambia el nombre del sprint."""
        self._nombre = nuevo_nombre


    def add_historia(self, historia_id: HistoriaId) -> None:
        if self._status is SprintStatus.CLOSED:
            raise BusinessRuleError(
                f"Cannot add historias to a {self._status.value} sprint"
            )
        if historia_id in self._backlog:
            raise BusinessRuleError(
                f"Historia '{historia_id}' is already in sprint '{self._id}'"
            )
        self._backlog.append(historia_id)

    def remove_historia(self, historia_id: HistoriaId) -> None:
        if self._status is SprintStatus.CLOSED:
            raise BusinessRuleError(
                f"Cannot remove historias from a {self._status.value} sprint"
            )
        if historia_id not in self._backlog:
            raise NotFoundError("HistoriaDeUsuario", str(historia_id))
        self._backlog = [h for h in self._backlog if h != historia_id]

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Sprint):
            return NotImplemented
        return self._id == other._id

    def __hash__(self) -> int:
        return hash(self._id)

    def __str__(self) -> str:
        return f"Sprint({self._id}, {self._nombre})"

    def __repr__(self) -> str:
        return (
            f"Sprint("
            f"id={self._id!r}, "
            f"nombre={self._nombre!r}, "
            f"status={self._status!r})"
        )


class ProyectoId(EntityId):
    pass


class Proyecto:
    _id: ProyectoId
    _nombre: NotEmptyString
    _descripcion: str
    _sprints: dict[SprintId, Sprint]
    _historias: dict[HistoriaId, HistoriaDeUsuario]
    _tareas: dict[TareaTecnicaId, TareaTecnica]
    _miembros: dict[str, str]
    _domain_events: list[DomainEvent]

    def __init__(
        self,
        nombre: NotEmptyString,
        descripcion: str = "",
        id: ProyectoId | None = None,
    ) -> None:
        self._id = id if id is not None else ProyectoId()
        self._nombre = nombre
        self._descripcion = descripcion
        self._sprints = {}
        self._historias = {}
        self._tareas = {}
        self._miembros = {}
        self._domain_events = []

    @classmethod
    def create(cls, nombre: NotEmptyString, descripcion: str = "") -> Proyecto:
        proyecto = cls(nombre=nombre, descripcion=descripcion)
        proyecto._register_event(
            ProyectoCreado(
                proyecto_id=str(proyecto.id),
                nombre=str(nombre),
            )
        )
        return proyecto

    @property
    def descripcion(self) -> str:
        return self._descripcion

    def update_info(self, nombre: NotEmptyString, descripcion: str) -> None:
        self._nombre = nombre
        self._descripcion = descripcion

    def _register_event(self, event: DomainEvent) -> None:
        self._domain_events.append(event)

    def pull_domain_events(self) -> list[DomainEvent]:
        events = list(self._domain_events)
        self._domain_events.clear()
        return events

    @property
    def id(self) -> ProyectoId:
        return self._id

    @property
    def nombre(self) -> NotEmptyString:
        return self._nombre

    @property
    def sprints(self) -> list[Sprint]:
        return list(self._sprints.values())

    @property
    def historias(self) -> list[HistoriaDeUsuario]:
        return list(self._historias.values())

    def add_historia(self, historia: HistoriaDeUsuario) -> None:
        if historia.id in self._historias:
            raise BusinessRuleError(
                f"Historia '{historia.id}' already exists in proyecto '{self._id}'"
            )
        self._historias[historia.id] = historia
        self._register_event(
            HistoriaAgregada(
                proyecto_id=str(self._id),
                historia_id=str(historia.id),
                titulo=str(historia.title),
                story_points=historia.story_points.value,
            )
        )

    def create_sprint(
        self,
        nombre: NotEmptyString,
        fecha_inicio: datetime | None = None,
        fecha_fin: datetime | None = None,
    ) -> Sprint:
        sprint = Sprint(nombre=nombre, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin)
        self._sprints[sprint.id] = sprint
        self._register_event(
            SprintCreado(
                proyecto_id=str(self._id),
                sprint_id=str(sprint.id),
                nombre=str(nombre),
            )
        )
        return sprint

    def add_historia_to_sprint(
        self, historia_id: HistoriaId, sprint_id: SprintId
    ) -> None:
        if historia_id not in self._historias:
            raise NotFoundError("HistoriaDeUsuario", str(historia_id))
        if sprint_id not in self._sprints:
            raise NotFoundError("Sprint", str(sprint_id))

        sprint = self._sprints[sprint_id]

        if sprint.status is SprintStatus.ACTIVE:
            for existing_sprint in self._sprints.values():
                if existing_sprint.id == sprint_id:
                    continue
                if (
                    existing_sprint.status is SprintStatus.ACTIVE
                    and historia_id in existing_sprint.backlog
                ):
                    raise BusinessRuleError(
                        f"Historia '{historia_id}' is already in active sprint "
                        f"'{existing_sprint.id}'"
                    )

        sprint.add_historia(historia_id)
        self._register_event(
            HistoriaAsignadaASprint(
                proyecto_id=str(self._id),
                sprint_id=str(sprint_id),
                historia_id=str(historia_id),
            )
        )

    def start_sprint(
        self, sprint_id: SprintId, fecha_inicio: datetime | None = None
    ) -> None:
        sprint = self.get_sprint(sprint_id)
        sprint.start(fecha_inicio)
        self._register_event(
            SprintIniciado(
                proyecto_id=str(self._id),
                sprint_id=str(sprint.id),
                fecha_inicio=str(sprint.fecha_inicio),
            )
        )

    def get_sprint(self, sprint_id: SprintId) -> Sprint:
        if sprint_id not in self._sprints:
            raise NotFoundError("Sprint", str(sprint_id))
        return self._sprints[sprint_id]

    def get_historia(self, historia_id: HistoriaId) -> HistoriaDeUsuario:
        if historia_id not in self._historias:
            raise NotFoundError("HistoriaDeUsuario", str(historia_id))
        return self._historias[historia_id]

    def remove_sprint(self, sprint_id: SprintId) -> None:
        if sprint_id not in self._sprints:
            raise NotFoundError("Sprint", str(sprint_id))
        sprint = self._sprints[sprint_id]
        # Move stories back to backlog (unassign them from sprint)
        for historia_id in list(sprint.backlog):
            if historia_id in self._historias:
                self._historias[historia_id]._sprint_id = None
        del self._sprints[sprint_id]

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Proyecto):
            return NotImplemented
        return self._id == other._id

    def __hash__(self) -> int:
        return hash(self._id)

    def __str__(self) -> str:
        return f"Proyecto({self._id}, {self._nombre})"

    def __repr__(self) -> str:
        return (
            f"Proyecto("
            f"id={self._id!r}, "
            f"nombre={self._nombre!r})"
        )

    def close_sprint(
        self, sprint_id: SprintId, fecha_fin: datetime | None = None
    ) -> None:
        sprint = self.get_sprint(sprint_id)
        sprint.close(fecha_fin)
        self._register_event(
            SprintCerrado(
                proyecto_id=str(self._id),
                sprint_id=str(sprint.id),
                fecha_fin=sprint.fecha_fin.isoformat() if sprint.fecha_fin else "",
            )
        )

    def reopen_sprint(self, sprint_id: SprintId) -> None:
        sprint = self.get_sprint(sprint_id)
        sprint.reopen()
        self._register_event(
            SprintReabierto(
                proyecto_id=str(self._id),
                sprint_id=str(sprint.id),
            )
        )

    def add_tarea_tecnica(self, historia_id: HistoriaId, tarea: TareaTecnica) -> None:
        if historia_id not in self._historias:
            raise NotFoundError("HistoriaDeUsuario", str(historia_id))
        if tarea.id in self._tareas:
            raise BusinessRuleError(
                f"Tarea '{tarea.id}' already exists in proyecto '{self._id}'"
            )
        self._tareas[tarea.id] = tarea

    def start_tarea_tecnica(self, tarea_id: TareaTecnicaId) -> None:
        tarea = self.get_tarea(tarea_id)
        tarea.start_work()
        
        # Opcionalmente, cambiar el estado de la historia si es la primera tarea que se inicia
        historia = self.get_historia(tarea.historia_id)
        if historia.status == HistoriaStatus.PENDING:
            historia.start_work()

    def complete_tarea_tecnica(self, tarea_id: TareaTecnicaId) -> None:
        tarea = self.get_tarea(tarea_id)
        tarea.complete()
        
        # Opcionalmente, autocompletar la historia si todas sus tareas están terminadas
        historia = self.get_historia(tarea.historia_id)
        tareas_historia = [t for t in self._tareas.values() if t.historia_id == historia.id]
        if tareas_historia and all(t.status == TareaTecnicaStatus.DONE for t in tareas_historia):
            if historia.status == HistoriaStatus.IN_PROGRESS:
                historia.complete()

    def update_tarea_tecnica(
        self,
        tarea_id: TareaTecnicaId,
        titulo: NotEmptyString | None = None,
        descripcion: str | None = None,
        estimated_hours: HorasEstimadas | None = None,
    ) -> None:
        tarea = self.get_tarea(tarea_id)
        tarea.update(
            titulo=titulo,
            descripcion=descripcion,
            estimated_hours=estimated_hours,
        )

    @property
    def tareas(self) -> list[TareaTecnica]:
        return list(self._tareas.values())

    def get_tarea(self, tarea_id: TareaTecnicaId) -> TareaTecnica:
        if tarea_id not in self._tareas:
            raise NotFoundError("TareaTecnica", str(tarea_id))
        return self._tareas[tarea_id]

    def add_miembro(self, usuario_id: str, rol: str) -> None:
        self._miembros[usuario_id] = rol

    def remove_miembro(self, usuario_id: str) -> None:
        if usuario_id in self._miembros:
            del self._miembros[usuario_id]

    def remove_historia(self, historia_id: HistoriaId) -> None:
        if historia_id not in self._historias:
            raise NotFoundError("HistoriaDeUsuario", str(historia_id))
        del self._historias[historia_id]
        # Limpiar tareas técnicas asociadas a la historia eliminada
        self._tareas = {t_id: t for t_id, t in self._tareas.items() if t.historia_id != historia_id}
        # Remover de los backlog de los sprints
        for sprint in self._sprints.values():
            if historia_id in sprint.backlog:
                sprint.remove_historia(historia_id)

    def remove_tarea_tecnica(self, tarea_id: TareaTecnicaId) -> None:
        if tarea_id not in self._tareas:
            raise NotFoundError("TareaTecnica", str(tarea_id))
        del self._tareas[tarea_id]

    def rebuild(
        self,
        sprints: list[Sprint],
        historias: list[HistoriaDeUsuario],
        tareas: list[TareaTecnica],
        miembros: dict[str, str],
    ) -> None:
        self._sprints = {s.id: s for s in sprints}
        self._historias = {h.id: h for h in historias}
        self._tareas = {t.id: t for t in tareas}
        self._miembros = miembros

    @property
    def miembros(self) -> dict[str, str]:
        return dict(self._miembros)

