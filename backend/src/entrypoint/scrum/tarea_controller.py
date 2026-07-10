from __future__ import annotations

from litestar import Controller, delete, post, put
from litestar.exceptions import HTTPException
from litestar.params import FromPath

from src.entrypoint.scrum.schemas import (
    CreateTareaRequest,
    ProyectoResponse,
    UpdateTareaRequest,
    UpdateStatusRequest,
)
from src.scrum import ScrumFacade
from src.entrypoint.scrum.utils import _dict_to_response
from src.shared_kernel.domain.base_exceptions import BusinessRuleError, NotFoundError, ValidationError
from src.entrypoint.guards import require_project_member


class TareaController(Controller):
    path = "/proyectos"
    guards = [require_project_member]

    @post("/{proyecto_id:str}/historias/{historia_id:str}/tareas")
    async def create_tarea(
        self,
        proyecto_id: FromPath[str],
        historia_id: FromPath[str],
        data: CreateTareaRequest,
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            result = await scrum.add_tarea(
                proyecto_id,
                historia_id,
                titulo=data.titulo,
                estimated_hours=data.estimated_hours,
                descripcion=data.descripcion,
            )
        except ValidationError as exc:
            raise HTTPException(status_code=400, detail=exc.message)
        except NotFoundError as exc:
            raise HTTPException(status_code=404, detail=exc.message)
        except BusinessRuleError as exc:
            raise HTTPException(status_code=409, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)

    @put("/{proyecto_id:str}/tareas/{tarea_id:str}")
    async def update_tarea(
        self,
        proyecto_id: FromPath[str],
        tarea_id: FromPath[str],
        data: UpdateTareaRequest,
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            result = await scrum.update_tarea(
                proyecto_id,
                tarea_id,
                titulo=data.titulo,
                descripcion=data.descripcion,
                estimated_hours=data.estimated_hours,
            )
        except NotFoundError as exc:
            raise HTTPException(status_code=404, detail=exc.message)
        except (ValidationError, BusinessRuleError) as exc:
            raise HTTPException(status_code=400, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)

    @post("/{proyecto_id:str}/tareas/{tarea_id:str}/start")
    async def start_tarea(
        self,
        proyecto_id: FromPath[str],
        tarea_id: FromPath[str],
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            result = await scrum.update_tarea(proyecto_id, tarea_id, status="in_progress")
        except NotFoundError as exc:
            raise HTTPException(status_code=404, detail=exc.message)
        except BusinessRuleError as exc:
            raise HTTPException(status_code=409, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)

    @post("/{proyecto_id:str}/tareas/{tarea_id:str}/complete")
    async def complete_tarea(
        self,
        proyecto_id: FromPath[str],
        tarea_id: FromPath[str],
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            result = await scrum.update_tarea(proyecto_id, tarea_id, status="done")
        except NotFoundError as exc:
            raise HTTPException(status_code=404, detail=exc.message)
        except BusinessRuleError as exc:
            raise HTTPException(status_code=409, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)

    @put("/{proyecto_id:str}/tareas/{tarea_id:str}/status")
    async def update_tarea_status(
        self,
        proyecto_id: FromPath[str],
        tarea_id: FromPath[str],
        data: UpdateStatusRequest,
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        status_str = data.status
        if status_str == "completed":
            status_str = "done"
        try:
            result = await scrum.update_tarea(proyecto_id, tarea_id, status=status_str)
        except (NotFoundError, ValidationError) as exc:
            raise HTTPException(status_code=400, detail=exc.message)
        except BusinessRuleError as exc:
            raise HTTPException(status_code=409, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)
