from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any
from uuid import UUID

import aiosqlite

from src.db.connection import get_sqlite_connection
from src.scrum.infrastructure.outbox import serialize_event
from src.shared_kernel.infrastructure.cache import TTLCache

if TYPE_CHECKING:
    from src.db.pool import AsyncSQLitePool
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
from src.scrum.ports.proyecto_repository import ProyectoRepository
from src.shared_kernel.domain.base_value_objects import NotEmptyString


def _row_to_proyecto(row: aiosqlite.Row) -> Proyecto:
    descripcion = ""
    try:
        descripcion = row["descripcion"] or ""
    except (KeyError, IndexError, ValueError):
        pass
    return Proyecto(
        id=ProyectoId(UUID(row["id"])),
        nombre=NotEmptyString(row["nombre"]),
        descripcion=descripcion,
    )


def _row_to_sprint(row: aiosqlite.Row) -> Sprint:
    fecha_inicio = (
        datetime.fromisoformat(row["fecha_inicio"])
        if row["fecha_inicio"]
        else None
    )
    fecha_fin = (
        datetime.fromisoformat(row["fecha_fin"]) if row["fecha_fin"] else None
    )
    return Sprint(
        id=SprintId(UUID(row["id"])),
        nombre=NotEmptyString(row["nombre"]),
        status=SprintStatus(row["status"]),
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
    )


def _row_to_historia(row: aiosqlite.Row) -> HistoriaDeUsuario:
    asignado_a = None
    try:
        asignado_a = row["asignado_a"]
    except (KeyError, IndexError):
        pass
    return HistoriaDeUsuario(
        id=HistoriaId(UUID(row["id"])),
        title=NotEmptyString(row["titulo"]),
        story_points=StoryPoint(row["story_points"]),
        description=row["descripcion"],
        status=HistoriaStatus(row["status"]),
        asignado_a=asignado_a,
    )


_proyecto_list_cache: TTLCache[list[dict[str, Any]]] = TTLCache[list[dict[str, Any]]](ttl_seconds=15.0, maxsize=1)
_PROYECTO_LIST_CACHE_KEY = "list_proyectos"

_proyecto_detail_cache: TTLCache[Proyecto] = TTLCache[Proyecto](ttl_seconds=15.0, maxsize=64)


class ProyectoRepositorySQLite(ProyectoRepository):
    def __init__(
        self,
        pool: AsyncSQLitePool | None = None,
        list_cache: TTLCache[list[dict[str, Any]]] | None = None,
        detail_cache: TTLCache[Proyecto] | None = None,
    ) -> None:
        self._pool = pool
        self._list_cache = list_cache or _proyecto_list_cache
        self._detail_cache = detail_cache or _proyecto_detail_cache

    def _conn(self):
        if self._pool is not None:
            return self._pool.connection()
        return get_sqlite_connection()

    async def save(self, proyecto: Proyecto) -> None:
        await self._list_cache.invalidate(_PROYECTO_LIST_CACHE_KEY)
        await self._detail_cache.invalidate(str(proyecto.id))
        async with self._conn() as conn:
            await conn.execute(
                "INSERT OR REPLACE INTO proyectos (id, nombre, descripcion) VALUES (?, ?, ?)",
                (str(proyecto.id), str(proyecto.nombre), proyecto.descripcion),
            )
             # Delete sprints that were removed in domain model
            sprint_ids = [str(s.id) for s in proyecto.sprints]
            if sprint_ids:
                placeholders = ",".join("?" for _ in sprint_ids)
                await conn.execute(
                    f"DELETE FROM sprints WHERE proyecto_id = ? AND id NOT IN ({placeholders})",
                    (str(proyecto.id), *sprint_ids),
                )
            else:
                await conn.execute("DELETE FROM sprints WHERE proyecto_id = ?", (str(proyecto.id),))

            # Delete historias that were removed in domain model
            story_ids = [str(h.id) for h in proyecto.historias]
            if story_ids:
                placeholders = ",".join("?" for _ in story_ids)
                await conn.execute(
                    f"DELETE FROM historias WHERE proyecto_id = ? AND id NOT IN ({placeholders})",
                    (str(proyecto.id), *story_ids),
                )
            else:
                await conn.execute("DELETE FROM historias WHERE proyecto_id = ?", (str(proyecto.id),))

            # Delete tareas that were removed in domain model
            tarea_ids = [str(t.id) for t in proyecto.tareas]
            if tarea_ids:
                placeholders = ",".join("?" for _ in tarea_ids)
                await conn.execute(
                    f"DELETE FROM tareas_tecnicas WHERE historia_id IN (SELECT id FROM historias WHERE proyecto_id = ?) AND id NOT IN ({placeholders})",
                    (str(proyecto.id), *tarea_ids),
                )
            else:
                await conn.execute(
                    "DELETE FROM tareas_tecnicas WHERE historia_id IN (SELECT id FROM historias WHERE proyecto_id = ?)",
                    (str(proyecto.id),),
                )

            # Reset all stories sprint_id to NULL to allow re-assignment
            await conn.execute("UPDATE historias SET sprint_id = NULL WHERE proyecto_id = ?", (str(proyecto.id),))

            for sprint in proyecto.sprints:
                fecha_inicio = (
                    sprint.fecha_inicio.isoformat()
                    if sprint.fecha_inicio
                    else None
                )
                fecha_fin = (
                    sprint.fecha_fin.isoformat() if sprint.fecha_fin else None
                )
                await conn.execute(
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
            for historia in proyecto.historias:
                await conn.execute(
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
            for tarea in proyecto.tareas:
                await conn.execute(
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
            # Borrar miembros anteriores
            await conn.execute("DELETE FROM proyecto_miembros WHERE proyecto_id = ?", (str(proyecto.id),))
            # Insertar miembros actuales
            for uid, rol in proyecto.miembros.items():
                await conn.execute(
                    "INSERT INTO proyecto_miembros (proyecto_id, usuario_id, rol) VALUES (?, ?, ?)",
                    (str(proyecto.id), uid, rol),
                )
            for sprint in proyecto.sprints:
                for historia_id in sprint.backlog:
                    await conn.execute(
                        "UPDATE historias SET sprint_id = ? WHERE id = ?",
                        (str(sprint.id), str(historia_id)),
                    )
            events = proyecto.pull_domain_events()
            for event in events:
                event_id, event_type, payload, occurred_at, created_at = serialize_event(event)
                await conn.execute(
                    "INSERT INTO outbox_events "
                    "(id, aggregate_id, event_type, payload, occurred_at, created_at) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (event_id, str(proyecto.id), event_type, payload, occurred_at, created_at),
                )
            await conn.commit()

    async def find_by_id(self, proyecto_id: ProyectoId) -> Proyecto | None:
        # Intentar desde caché primero
        cached = await self._detail_cache.get(str(proyecto_id))
        if cached is not None:
            return cached

        async with self._conn() as conn:
            cursor = await conn.execute(
                "SELECT id, nombre, descripcion FROM proyectos WHERE id = ?",
                (str(proyecto_id),),
            )
            row = await cursor.fetchone()
            if row is None:
                return None

            proyecto = _row_to_proyecto(row)

            cursor = await conn.execute(
                "SELECT id, nombre, fecha_inicio, fecha_fin, status "
                "FROM sprints WHERE proyecto_id = ?",
                (str(proyecto_id),),
            )
            sprint_rows = await cursor.fetchall()
            sprints = []
            sprint_map: dict[str, Sprint] = {}
            for srow in sprint_rows:
                sprint = _row_to_sprint(srow)
                sprint_map[str(sprint.id)] = sprint
                sprints.append(sprint)

            cursor = await conn.execute(
                "SELECT id, titulo, descripcion, story_points, status, sprint_id, asignado_a "
                "FROM historias WHERE proyecto_id = ?",
                (str(proyecto_id),),
            )
            historia_rows = await cursor.fetchall()
            historias = []
            for hrow in historia_rows:
                historia = _row_to_historia(hrow)
                historias.append(historia)
                sprint_id_str = hrow["sprint_id"]
                if sprint_id_str and sprint_id_str in sprint_map:
                    sprint_map[sprint_id_str]._backlog.append(historia.id)

            # Cargar TODAS las tareas técnicas en una sola query (evita N+1)
            tareas = []
            if historias:
                historia_ids = [str(h.id) for h in historias]
                placeholders = ",".join("?" for _ in historia_ids)
                cursor = await conn.execute(
                    f"SELECT id, historia_id, titulo, descripcion, estimated_hours, status "
                    f"FROM tareas_tecnicas WHERE historia_id IN ({placeholders})",
                    historia_ids,
                )
                tarea_rows = await cursor.fetchall()
                for trow in tarea_rows:
                    tarea = TareaTecnica(
                        id=TareaTecnicaId(UUID(trow["id"])),
                        historia_id=HistoriaId(UUID(trow["historia_id"])),
                        title=NotEmptyString(trow["titulo"]),
                        description=trow["descripcion"],
                        estimated_hours=HorasEstimadas(trow["estimated_hours"]),
                        status=TareaTecnicaStatus(trow["status"]),
                    )
                    tareas.append(tarea)

            # Cargar miembros del proyecto
            cursor = await conn.execute(
                "SELECT usuario_id, rol FROM proyecto_miembros WHERE proyecto_id = ?",
                (str(proyecto_id),),
            )
            miembro_rows = await cursor.fetchall()
            miembros = {}
            for mrow in miembro_rows:
                miembros[mrow["usuario_id"]] = mrow["rol"]

            proyecto.rebuild(sprints=sprints, historias=historias, tareas=tareas, miembros=miembros)

            # Guardar en caché para requests subsiguientes
            await self._detail_cache.set(str(proyecto_id), proyecto)
            return proyecto

    async def list(self) -> list[Proyecto]:
        cached = await self._list_cache.get(_PROYECTO_LIST_CACHE_KEY)
        if cached is not None:
            proyectos = [_row_to_proyecto(row) for row in cached]
        else:
            async with self._conn() as conn:
                cursor = await conn.execute(
                    "SELECT id, nombre, descripcion FROM proyectos ORDER BY nombre"
                )
                rows = await cursor.fetchall()
            await self._list_cache.set(_PROYECTO_LIST_CACHE_KEY, rows)
            proyectos = [_row_to_proyecto(row) for row in rows]

        async with self._conn() as conn:
            cursor = await conn.execute(
                "SELECT proyecto_id, usuario_id, rol FROM proyecto_miembros"
            )
            miembro_rows = await cursor.fetchall()

        for p in proyectos:
            p_id_str = str(p.id)
            miembros = {}
            for m in miembro_rows:
                if m["proyecto_id"] == p_id_str:
                    miembros[m["usuario_id"]] = m["rol"]
            p.rebuild(sprints=p.sprints, historias=p.historias, tareas=p.tareas, miembros=miembros)

        return proyectos

    async def delete(self, proyecto_id: ProyectoId) -> None:
        await self._list_cache.invalidate(_PROYECTO_LIST_CACHE_KEY)
        await self._detail_cache.invalidate(str(proyecto_id))
        async with self._conn() as conn:
            await conn.execute(
                "DELETE FROM tareas_tecnicas "
                "WHERE historia_id IN (SELECT id FROM historias WHERE proyecto_id = ?)",
                (str(proyecto_id),),
            )
            await conn.execute(
                "DELETE FROM historias WHERE proyecto_id = ?",
                (str(proyecto_id),),
            )
            await conn.execute(
                "DELETE FROM sprints WHERE proyecto_id = ?",
                (str(proyecto_id),),
            )
            await conn.execute(
                "DELETE FROM proyecto_miembros WHERE proyecto_id = ?",
                (str(proyecto_id),),
            )
            await conn.execute(
                "DELETE FROM proyectos WHERE id = ?",
                (str(proyecto_id),),
            )
            await conn.commit()
