from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from libsql_client import create_client

from src.entrypoint.config import Settings
from src.scrum.domain.entities import (
    HistoriaDeUsuario,
    HistoriaId,
    HistoriaStatus,
    Proyecto,
    ProyectoId,
    Sprint,
    SprintId,
    SprintStatus,
    TareaTecnica,
    TareaTecnicaId,
    TareaTecnicaStatus,
)
from src.scrum.domain.value_objects import HorasEstimadas, StoryPoint
from src.scrum.infrastructure.outbox import serialize_event
from src.scrum.ports.proyecto_repository import ProyectoRepository
from src.shared_kernel.domain.base_value_objects import NotEmptyString


def _normalize_url(url: str) -> str:
    return url.replace("libsql://", "https://", 1)


def _row_to_proyecto(id_str: str, nombre: str, descripcion: str = "") -> Proyecto:
    return Proyecto(
        id=ProyectoId(UUID(id_str)),
        nombre=NotEmptyString(nombre),
        descripcion=descripcion,
    )


def _row_to_sprint(
    id_str: str,
    nombre: str,
    fecha_inicio: str | None,
    fecha_fin: str | None,
    status: str,
) -> Sprint:
    return Sprint(
        id=SprintId(UUID(id_str)),
        nombre=NotEmptyString(nombre),
        status=SprintStatus(status),
        fecha_inicio=(
            datetime.fromisoformat(fecha_inicio) if fecha_inicio else None
        ),
        fecha_fin=(
            datetime.fromisoformat(fecha_fin) if fecha_fin else None
        ),
    )


def _row_to_historia(
    id_str: str,
    titulo: str,
    descripcion: str | None,
    story_points: int,
    status: str,
    asignado_a: str | None = None,
) -> HistoriaDeUsuario:
    return HistoriaDeUsuario(
        id=HistoriaId(UUID(id_str)),
        title=NotEmptyString(titulo),
        story_points=StoryPoint(story_points),
        description=descripcion,
        status=HistoriaStatus(status),
        asignado_a=asignado_a,
    )


class ProyectoRepositorioTurso(ProyectoRepository):
    def __init__(self, settings: Settings | None = None) -> None:
        s = settings if settings is not None else Settings.from_env()
        if not s.is_turso_enabled:
            raise RuntimeError(
                "Turso is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN."
            )
        self._url = _normalize_url(s.turso_url)
        self._token = s.turso_token

    async def save(self, proyecto: Proyecto) -> None:
        stmts: list[tuple[str, tuple]] = [
            (
                "INSERT OR REPLACE INTO proyectos (id, nombre, descripcion) VALUES (?, ?, ?)",
                (str(proyecto.id), str(proyecto.nombre), proyecto.descripcion),
            )
        ]
        
        # Delete sprints that were removed in domain model
        sprint_ids = [str(s.id) for s in proyecto.sprints]
        if sprint_ids:
            placeholders = ",".join("?" for _ in sprint_ids)
            stmts.append(
                (
                    f"DELETE FROM sprints WHERE proyecto_id = ? AND id NOT IN ({placeholders})",
                    (str(proyecto.id), *sprint_ids),
                )
            )
        else:
            stmts.append(
                (
                    "DELETE FROM sprints WHERE proyecto_id = ?",
                    (str(proyecto.id),),
                )
            )

        # Delete historias that were removed in domain model
        story_ids = [str(h.id) for h in proyecto.historias]
        if story_ids:
            placeholders = ",".join("?" for _ in story_ids)
            stmts.append(
                (
                    f"DELETE FROM historias WHERE proyecto_id = ? AND id NOT IN ({placeholders})",
                    (str(proyecto.id), *story_ids),
                )
            )
        else:
            stmts.append(
                (
                    "DELETE FROM historias WHERE proyecto_id = ?",
                    (str(proyecto.id),),
                )
            )

        # Delete tareas that were removed in domain model
        tarea_ids = [str(t.id) for t in proyecto.tareas]
        if tarea_ids:
            placeholders = ",".join("?" for _ in tarea_ids)
            stmts.append(
                (
                    f"DELETE FROM tareas_tecnicas WHERE historia_id IN (SELECT id FROM historias WHERE proyecto_id = ?) AND id NOT IN ({placeholders})",
                    (str(proyecto.id), *tarea_ids),
                )
            )
        else:
            stmts.append(
                (
                    "DELETE FROM tareas_tecnicas WHERE historia_id IN (SELECT id FROM historias WHERE proyecto_id = ?)",
                    (str(proyecto.id),),
                )
            )

        # Reset all stories sprint_id to NULL to allow re-assignment
        stmts.append(
            (
                "UPDATE historias SET sprint_id = NULL WHERE proyecto_id = ?",
                (str(proyecto.id),),
            )
        )

        for sprint in proyecto.sprints:
            fecha_inicio = (
                sprint.fecha_inicio.isoformat()
                if sprint.fecha_inicio
                else None
            )
            fecha_fin = (
                sprint.fecha_fin.isoformat()
                if sprint.fecha_fin
                else None
            )
            stmts.append(
                (
                    "INSERT OR REPLACE INTO sprints "
                    "(id, proyecto_id, nombre, fecha_inicio, fecha_fin, status) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        str(sprint.id),
                        str(proyecto.id),
                        str(sprint.nombre),
                        fecha_inicio,
                        fecha_fin,
                        sprint.status.value,
                    ),
                )
            )
        for historia in proyecto.historias:
            stmts.append(
                (
                    "INSERT OR REPLACE INTO historias "
                    "(id, proyecto_id, titulo, descripcion, story_points, status, asignado_a) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (
                        str(historia.id),
                        str(proyecto.id),
                        str(historia.title),
                        historia.description,
                        historia.story_points.value,
                        historia.status.value,
                        historia.asignado_a,
                    ),
                )
            )
        for tarea in proyecto.tareas:
            stmts.append(
                (
                    "INSERT OR REPLACE INTO tareas_tecnicas "
                    "(id, historia_id, titulo, descripcion, estimated_hours, status) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        str(tarea.id),
                        str(tarea.historia_id),
                        str(tarea.title),
                        tarea.description,
                        tarea.estimated_hours.value,
                        tarea.status.value,
                    ),
                )
            )
        # Borrar miembros anteriores
        stmts.append(
            (
                "DELETE FROM proyecto_miembros WHERE proyecto_id = ?",
                (str(proyecto.id),),
            )
        )
        # Insertar miembros actuales
        for uid, rol in proyecto.miembros.items():
            stmts.append(
                (
                    "INSERT INTO proyecto_miembros (proyecto_id, usuario_id, rol) VALUES (?, ?, ?)",
                    (str(proyecto.id), uid, rol),
                )
            )
        for sprint in proyecto.sprints:
            for historia_id in sprint.backlog:
                stmts.append(
                    (
                        "UPDATE historias SET sprint_id = ? WHERE id = ?",
                        (str(sprint.id), str(historia_id)),
                    )
                )

        events = proyecto.pull_domain_events()
        for event in events:
            event_id, event_type, payload, occurred_at, created_at = serialize_event(event)
            stmts.append(
                (
                    "INSERT INTO outbox_events "
                    "(id, aggregate_id, event_type, payload, occurred_at, created_at) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        event_id,
                        str(proyecto.id),
                        event_type,
                        payload,
                        occurred_at,
                        created_at,
                    ),
                )
            )

        client = create_client(url=self._url, auth_token=self._token)
        try:
            await client.batch(stmts)
        finally:
            await client.close()

    async def find_by_id(self, proyecto_id: ProyectoId) -> Proyecto | None:
        client = create_client(url=self._url, auth_token=self._token)
        try:
            result = await client.execute(
                "SELECT id, nombre, descripcion FROM proyectos WHERE id = ?",
                (str(proyecto_id),),
            )
            if not result.rows:
                return None

            row = result.rows[0]
            proyecto = _row_to_proyecto(row["id"], row["nombre"], row["descripcion"] or "")

            result = await client.execute(
                "SELECT id, nombre, fecha_inicio, fecha_fin, status "
                "FROM sprints WHERE proyecto_id = ?",
                (str(proyecto_id),),
            )
            sprint_map: dict[str, Sprint] = {}
            for row in result.rows:
                sprint = _row_to_sprint(
                    row["id"],
                    row["nombre"],
                    row["fecha_inicio"],
                    row["fecha_fin"],
                    row["status"],
                )
                sprint_map[row["id"]] = sprint
                proyecto._sprints[sprint.id] = sprint

            result = await client.execute(
                "SELECT id, titulo, descripcion, story_points, status, sprint_id, asignado_a "
                "FROM historias WHERE proyecto_id = ?",
                (str(proyecto_id),),
            )
            for row in result.rows:
                historia = _row_to_historia(
                    row["id"],
                    row["titulo"],
                    row["descripcion"],
                    row["story_points"],
                    row["status"],
                    row["asignado_a"],
                )
                proyecto._historias[historia.id] = historia
                sprint_id_str = None
                try:
                    sprint_id_str = row["sprint_id"]
                except KeyError:
                    pass
                if sprint_id_str and sprint_id_str in sprint_map:
                    sprint_map[sprint_id_str]._backlog.append(historia.id)

            # Cargar TODAS las tareas técnicas en una sola query (evita N+1 round-trips HTTP)
            historia_ids = list(proyecto._historias.keys())
            if historia_ids:
                placeholders = ",".join("?" for _ in historia_ids)
                result = await client.execute(
                    f"SELECT id, historia_id, titulo, descripcion, estimated_hours, status "
                    f"FROM tareas_tecnicas WHERE historia_id IN ({placeholders})",
                    [str(hid) for hid in historia_ids],
                )
                for row in result.rows:
                    tarea = TareaTecnica(
                        id=TareaTecnicaId(UUID(row["id"])),
                        historia_id=HistoriaId(UUID(row["historia_id"])),
                        title=NotEmptyString(row["titulo"]),
                        description=row["descripcion"],
                        estimated_hours=HorasEstimadas(row["estimated_hours"]),
                        status=TareaTecnicaStatus(row["status"]),
                    )
                    proyecto._tareas[tarea.id] = tarea

            # Cargar miembros del proyecto
            result = await client.execute(
                "SELECT usuario_id, rol FROM proyecto_miembros WHERE proyecto_id = ?",
                (str(proyecto_id),),
            )
            for row in result.rows:
                proyecto._miembros[row["usuario_id"]] = row["rol"]

            return proyecto
        finally:
            await client.close()

    async def list(self) -> list[Proyecto]:
        client = create_client(url=self._url, auth_token=self._token)
        try:
            result = await client.execute(
                "SELECT id, nombre, descripcion FROM proyectos ORDER BY nombre"
            )
            proyectos = [_row_to_proyecto(row["id"], row["nombre"], row["descripcion"] or "") for row in result.rows]

            result_miembros = await client.execute(
                "SELECT proyecto_id, usuario_id, rol FROM proyecto_miembros"
            )
            for p in proyectos:
                p_id_str = str(p.id)
                for row in result_miembros.rows:
                    if row["proyecto_id"] == p_id_str:
                        p._miembros[row["usuario_id"]] = row["rol"]
            return proyectos
        finally:
            await client.close()

    async def delete(self, proyecto_id: ProyectoId) -> None:
        stmts: list[tuple[str, tuple]] = [
            (
                "DELETE FROM tareas_tecnicas "
                "WHERE historia_id IN (SELECT id FROM historias WHERE proyecto_id = ?)",
                (str(proyecto_id),),
            ),
            (
                "DELETE FROM historias WHERE proyecto_id = ?",
                (str(proyecto_id),),
            ),
            (
                "DELETE FROM sprints WHERE proyecto_id = ?",
                (str(proyecto_id),),
            ),
            (
                "DELETE FROM proyecto_miembros WHERE proyecto_id = ?",
                (str(proyecto_id),),
            ),
            (
                "DELETE FROM proyectos WHERE id = ?",
                (str(proyecto_id),),
            ),
        ]
        client = create_client(url=self._url, auth_token=self._token)
        try:
            await client.batch(stmts)
        finally:
            await client.close()
