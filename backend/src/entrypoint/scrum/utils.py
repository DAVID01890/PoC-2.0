from __future__ import annotations

from src.entrypoint.scrum.schemas import (
    HistoriaResponse,
    ProyectoResponse,
    SprintResponse,
    TareaResponse,
)


def _dict_to_response(d: dict) -> ProyectoResponse:
    return ProyectoResponse(
        id=d["id"],
        nombre=d["nombre"],
        descripcion=d["descripcion"],
        sprints=[
            SprintResponse(
                id=s["id"],
                nombre=s["nombre"],
                status=s["status"],
                fecha_inicio=s["fecha_inicio"],
                fecha_fin=s["fecha_fin"],
                backlog=s["backlog"],
            )
            for s in d["sprints"]
        ],
        historias=[
            HistoriaResponse(
                id=h["id"],
                titulo=h["titulo"],
                descripcion=h["descripcion"],
                story_points=h["story_points"],
                status=h["status"],
                asignado_a=h.get("asignado_a"),
                asignados=h.get("asignados", []),
            )
            for h in d["historias"]
        ],
        tareas=[
            TareaResponse(
                id=t["id"],
                historia_id=t["historia_id"],
                titulo=t["titulo"],
                descripcion=t["descripcion"],
                estimated_hours=t["estimated_hours"],
                status=t["status"],
            )
            for t in d["tareas"]
        ],
        miembros=d["miembros"],
    )
