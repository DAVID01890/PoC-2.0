"""Fachada pública del módulo Scrum.

Toda la lógica de proyectos, sprints, historias y tareas se accede
a través de ScrumFacade. Los módulos externos NO deben importar desde
src.scrum.domain directamente.
"""
from __future__ import annotations

from uuid import UUID

from src.scrum.domain.entities import (
    HistoriaDeUsuario,
    HistoriaId,
    HistoriaStatus,
    Proyecto,
    ProyectoId,
    SprintId,
    TareaTecnica,
    TareaTecnicaId,
    TareaTecnicaStatus,
)
from src.scrum.domain.value_objects import HorasEstimadas, StoryPoint
from src.scrum.ports.proyecto_repository import ProyectoRepository
from src.shared_kernel.domain.base_exceptions import (
    BusinessRuleError,
    NotFoundError,
    ValidationError,
)
from src.shared_kernel.domain.base_value_objects import NotEmptyString


class ScrumFacade:
    """Fachada pública del módulo Scrum."""

    def __init__(self, proyecto_repo: ProyectoRepository) -> None:
        self._proyecto_repo = proyecto_repo

    # ------------------------------------------------------------------
    # Proyectos
    # ------------------------------------------------------------------

    async def create_proyecto(
        self, nombre: str, descripcion: str = "", creator_id: str | None = None
    ) -> dict:
        proyecto = Proyecto.create(
            nombre=NotEmptyString(nombre),
            descripcion=descripcion,
        )
        if creator_id:
            proyecto.add_miembro(creator_id, "owner")
        await self._proyecto_repo.save(proyecto)
        return self._proyecto_to_dict(proyecto)

    async def get_proyecto(self, proyecto_id: str) -> dict | None:
        try:
            pid = ProyectoId(UUID(proyecto_id))
        except ValueError:
            return None
        proyecto = await self._proyecto_repo.find_by_id(pid)
        return self._proyecto_to_dict(proyecto) if proyecto else None

    async def list_proyectos(self) -> list[dict]:
        proyectos = await self._proyecto_repo.list()
        return [self._proyecto_to_dict(p) for p in proyectos]

    async def update_proyecto(
        self, proyecto_id: str, nombre: str, descripcion: str
    ) -> dict | None:
        pid = ProyectoId(UUID(proyecto_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return None
        proyecto.update_info(nombre=NotEmptyString(nombre), descripcion=descripcion)
        await self._proyecto_repo.save(proyecto)
        return self._proyecto_to_dict(proyecto)

    async def delete_proyecto(self, proyecto_id: str) -> bool:
        pid = ProyectoId(UUID(proyecto_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return False
        await self._proyecto_repo.delete(pid)
        return True

    # ------------------------------------------------------------------
    # Historias de usuario
    # ------------------------------------------------------------------

    async def add_historia(
        self,
        proyecto_id: str,
        titulo: str,
        story_points: int,
        descripcion: str | None = None,
        asignado_a: str | list[str] | None = None,
    ) -> dict | None:
        pid = ProyectoId(UUID(proyecto_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return None
        historia = HistoriaDeUsuario(
            title=NotEmptyString(titulo),
            story_points=StoryPoint(story_points),
            description=descripcion,
            asignado_a=asignado_a,
        )
        proyecto.add_historia(historia)
        await self._proyecto_repo.save(proyecto)
        return self._proyecto_to_dict(proyecto)

    async def update_historia(
        self,
        proyecto_id: str,
        historia_id: str,
        titulo: str | None = None,
        story_points: int | None = None,
        descripcion: str | None = None,
        status: str | None = None,
        asignado_a: str | list[str] | None = None,
        clear_asignado: bool = False,
    ) -> dict | None:
        pid = ProyectoId(UUID(proyecto_id))
        hid = HistoriaId(UUID(historia_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return None
        historia = proyecto.get_historia(hid)

        historia.update_details(
            titulo=NotEmptyString(titulo) if titulo is not None else None,
            story_points=StoryPoint(story_points) if story_points is not None else None,
            descripcion=descripcion if descripcion is not None else None,
            asignado_a=asignado_a,
            clear_asignado=clear_asignado,
        )
        if status is not None:
            self._apply_historia_status(historia, status)

        await self._proyecto_repo.save(proyecto)
        return self._proyecto_to_dict(proyecto)

    async def delete_historia(self, proyecto_id: str, historia_id: str) -> bool:
        pid = ProyectoId(UUID(proyecto_id))
        hid = HistoriaId(UUID(historia_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return False
        try:
            proyecto.remove_historia(hid)
        except NotFoundError:
            return False
        await self._proyecto_repo.save(proyecto)
        return True

    # ------------------------------------------------------------------
    # Sprints
    # ------------------------------------------------------------------

    async def create_sprint(
        self,
        proyecto_id: str,
        nombre: str,
        fecha_inicio: datetime | None = None,
        fecha_fin: datetime | None = None,
    ) -> dict | None:
        pid = ProyectoId(UUID(proyecto_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return None
        proyecto.create_sprint(
            nombre=NotEmptyString(nombre),
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
        )
        await self._proyecto_repo.save(proyecto)
        return self._proyecto_to_dict(proyecto)

    async def update_sprint_status(
        self, proyecto_id: str, sprint_id: str, status: str
    ) -> dict | None:
        pid = ProyectoId(UUID(proyecto_id))
        sid = SprintId(UUID(sprint_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return None
        if status == "active":
            proyecto.start_sprint(sid)
        elif status == "closed":
            proyecto.close_sprint(sid)
        elif status == "planned":
            proyecto.reopen_sprint(sid)
        else:
            raise ValidationError(f"Estado de sprint inválido: {status}")
        await self._proyecto_repo.save(proyecto)
        return self._proyecto_to_dict(proyecto)

    async def delete_sprint(self, proyecto_id: str, sprint_id: str) -> bool:
        pid = ProyectoId(UUID(proyecto_id))
        sid = SprintId(UUID(sprint_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return False
        proyecto.remove_sprint(sid)
        await self._proyecto_repo.save(proyecto)
        return True

    async def update_sprint_name(
        self, proyecto_id: str, sprint_id: str, nombre: str
    ) -> dict | None:
        pid = ProyectoId(UUID(proyecto_id))
        sid = SprintId(UUID(sprint_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return None
        sprint = proyecto.get_sprint(sid)
        sprint.rename(NotEmptyString(nombre))
        await self._proyecto_repo.save(proyecto)
        return self._proyecto_to_dict(proyecto)

    async def add_historia_to_sprint(
        self, proyecto_id: str, sprint_id: str, historia_id: str
    ) -> dict | None:
        pid = ProyectoId(UUID(proyecto_id))
        sid = SprintId(UUID(sprint_id))
        hid = HistoriaId(UUID(historia_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return None
        proyecto.add_historia_to_sprint(hid, sid)
        await self._proyecto_repo.save(proyecto)
        return self._proyecto_to_dict(proyecto)

    async def remove_historia_from_sprint(
        self, proyecto_id: str, sprint_id: str, historia_id: str
    ) -> dict | None:
        pid = ProyectoId(UUID(proyecto_id))
        sid = SprintId(UUID(sprint_id))
        hid = HistoriaId(UUID(historia_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return None
        sprint = proyecto.get_sprint(sid)
        sprint.remove_historia(hid)
        await self._proyecto_repo.save(proyecto)
        return self._proyecto_to_dict(proyecto)

    # ------------------------------------------------------------------
    # Tareas técnicas
    # ------------------------------------------------------------------

    async def add_tarea(
        self,
        proyecto_id: str,
        historia_id: str,
        titulo: str,
        estimated_hours: int = 1,
        descripcion: str | None = None,
    ) -> dict | None:
        pid = ProyectoId(UUID(proyecto_id))
        hid = HistoriaId(UUID(historia_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return None
        tarea = TareaTecnica(
            historia_id=hid,
            title=NotEmptyString(titulo),
            estimated_hours=HorasEstimadas(estimated_hours),
            description=descripcion,
        )
        proyecto.add_tarea_tecnica(hid, tarea)
        await self._proyecto_repo.save(proyecto)
        return self._proyecto_to_dict(proyecto)

    async def update_tarea(
        self,
        proyecto_id: str,
        tarea_id: str,
        titulo: str | None = None,
        descripcion: str | None = None,
        estimated_hours: int | None = None,
        status: str | None = None,
    ) -> dict | None:
        pid = ProyectoId(UUID(proyecto_id))
        tid = TareaTecnicaId(UUID(tarea_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return None

        proyecto.update_tarea_tecnica(
            tarea_id=tid,
            titulo=NotEmptyString(titulo) if titulo else None,
            descripcion=descripcion,
            estimated_hours=HorasEstimadas(estimated_hours) if estimated_hours else None,
        )
        if status is not None:
            tarea = proyecto.get_tarea(tid)
            self._apply_tarea_status(proyecto, tarea, status)

        await self._proyecto_repo.save(proyecto)
        return self._proyecto_to_dict(proyecto)

    async def delete_tarea(self, proyecto_id: str, tarea_id: str) -> bool:
        pid = ProyectoId(UUID(proyecto_id))
        tid = TareaTecnicaId(UUID(tarea_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return False
        try:
            proyecto.remove_tarea_tecnica(tid)
        except NotFoundError:
            return False
        await self._proyecto_repo.save(proyecto)
        return True

    # ------------------------------------------------------------------
    # Miembros
    # ------------------------------------------------------------------

    async def add_miembro(
        self, proyecto_id: str, usuario_id: str, rol: str
    ) -> dict | None:
        pid = ProyectoId(UUID(proyecto_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return None
        proyecto.add_miembro(usuario_id, rol)
        await self._proyecto_repo.save(proyecto)
        return self._proyecto_to_dict(proyecto)

    async def remove_miembro(self, proyecto_id: str, usuario_id: str) -> dict | None:
        pid = ProyectoId(UUID(proyecto_id))
        proyecto = await self._proyecto_repo.find_by_id(pid)
        if not proyecto:
            return None
        proyecto.remove_miembro(usuario_id)
        await self._proyecto_repo.save(proyecto)
        return self._proyecto_to_dict(proyecto)

    # ------------------------------------------------------------------
    # Helpers estáticos
    # ------------------------------------------------------------------

    @staticmethod
    def _apply_historia_status(historia: HistoriaDeUsuario, status: str) -> None:
        current = historia.status
        target = HistoriaStatus(status)
        if current == target:
            return
        if target == HistoriaStatus.IN_PROGRESS and current == HistoriaStatus.PENDING:
            historia.start_work()
        elif target == HistoriaStatus.DONE and current == HistoriaStatus.IN_PROGRESS:
            historia.complete()
        elif target == HistoriaStatus.PENDING and current == HistoriaStatus.DONE:
            historia.reopen()
        else:
            # Transición directa usando método público encapsulado en lugar de mutar _status
            historia.update_status(target)

    @staticmethod
    def _apply_tarea_status(
        proyecto: Proyecto, tarea: TareaTecnica, status: str
    ) -> None:
        current = tarea.status
        target = TareaTecnicaStatus(status)
        if current == target:
            return
        if target == TareaTecnicaStatus.IN_PROGRESS and current == TareaTecnicaStatus.PENDING:
            proyecto.start_tarea_tecnica(tarea.id)
        elif target == TareaTecnicaStatus.DONE and current == TareaTecnicaStatus.IN_PROGRESS:
            proyecto.complete_tarea_tecnica(tarea.id)
        else:
            tarea.update_status(target)

    @staticmethod
    def _proyecto_to_dict(proyecto: Proyecto) -> dict:
        return {
            "id": str(proyecto.id),
            "nombre": str(proyecto.nombre),
            "descripcion": proyecto.descripcion,
            "sprints": [
                {
                    "id": str(s.id),
                    "nombre": str(s.nombre),
                    "status": s.status.value,
                    "fecha_inicio": s.fecha_inicio.isoformat() if s.fecha_inicio else None,
                    "fecha_fin": s.fecha_fin.isoformat() if s.fecha_fin else None,
                    "backlog": [str(h) for h in s.backlog],
                }
                for s in proyecto.sprints
            ],
            "historias": [
                {
                    "id": str(h.id),
                    "titulo": str(h.title),
                    "descripcion": h.description,
                    "story_points": h.story_points.value,
                    "status": h.status.value,
                    "asignado_a": h.asignado_a,
                    "asignados": h.asignados,
                }
                for h in proyecto.historias
            ],
            "tareas": [
                {
                    "id": str(t.id),
                    "historia_id": str(t.historia_id),
                    "titulo": str(t.title),
                    "descripcion": t.description,
                    "estimated_hours": t.estimated_hours.value,
                    "status": t.status.value,
                }
                for t in proyecto.tareas
            ],
            "miembros": dict(proyecto.miembros),
        }
