from __future__ import annotations

from litestar import Controller, delete, post, put
from litestar.exceptions import HTTPException
from litestar.params import FromPath

from src.entrypoint.scrum.schemas import (
    AddHistoriaToSprintRequest,
    CreateSprintRequest,
    ProyectoResponse,
    UpdateSprintRequest,
    UpdateStatusRequest,
)
from src.scrum import ScrumFacade
from src.entrypoint.scrum.utils import _dict_to_response
from src.shared_kernel.domain.base_exceptions import BusinessRuleError, NotFoundError, ValidationError
from src.entrypoint.guards import require_project_member


class SprintController(Controller):
    path = "/proyectos"
    guards = [require_project_member]

    @post("/{proyecto_id:str}/sprints")
    async def create_sprint(
        self,
        proyecto_id: FromPath[str],
        data: CreateSprintRequest,
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            result = await scrum.create_sprint(proyecto_id, data.nombre)
        except ValidationError as exc:
            raise HTTPException(status_code=400, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)

    @delete("/{proyecto_id:str}/sprints/{sprint_id:str}", status_code=200)
    async def delete_sprint(
        self,
        proyecto_id: FromPath[str],
        sprint_id: FromPath[str],
        scrum: ScrumFacade,
    ) -> dict:
        try:
            deleted = await scrum.delete_sprint(proyecto_id, sprint_id)
        except (NotFoundError, BusinessRuleError) as exc:
            raise HTTPException(status_code=404, detail=exc.message)
        if not deleted:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return {"status": "deleted"}

    @put("/{proyecto_id:str}/sprints/{sprint_id:str}")
    async def rename_sprint(
        self,
        proyecto_id: FromPath[str],
        sprint_id: FromPath[str],
        data: UpdateSprintRequest,
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            result = await scrum.update_sprint_name(proyecto_id, sprint_id, data.nombre)
        except (NotFoundError, ValidationError) as exc:
            raise HTTPException(status_code=400, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)

    @delete("/{proyecto_id:str}/sprints/{sprint_id:str}/historias/{historia_id:str}", status_code=200)
    async def remove_historia_from_sprint(
        self,
        proyecto_id: FromPath[str],
        sprint_id: FromPath[str],
        historia_id: FromPath[str],
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            result = await scrum.remove_historia_from_sprint(
                proyecto_id, sprint_id, historia_id
            )
        except NotFoundError as exc:
            raise HTTPException(status_code=404, detail=exc.message)
        except BusinessRuleError as exc:
            raise HTTPException(status_code=409, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)


    @post("/{proyecto_id:str}/sprints/historias")
    async def add_historia_to_sprint(
        self,
        proyecto_id: FromPath[str],
        data: AddHistoriaToSprintRequest,
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            result = await scrum.add_historia_to_sprint(
                proyecto_id, data.sprint_id, data.historia_id
            )
        except NotFoundError as exc:
            raise HTTPException(status_code=404, detail=exc.message)
        except BusinessRuleError as exc:
            raise HTTPException(status_code=409, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)

    @post("/{proyecto_id:str}/sprints/{sprint_id:str}/start")
    async def start_sprint(
        self,
        proyecto_id: FromPath[str],
        sprint_id: FromPath[str],
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            result = await scrum.update_sprint_status(proyecto_id, sprint_id, "active")
        except NotFoundError as exc:
            raise HTTPException(status_code=404, detail=exc.message)
        except BusinessRuleError as exc:
            raise HTTPException(status_code=409, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)

    @post("/{proyecto_id:str}/sprints/{sprint_id:str}/close")
    async def close_sprint(
        self,
        proyecto_id: FromPath[str],
        sprint_id: FromPath[str],
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            result = await scrum.update_sprint_status(proyecto_id, sprint_id, "closed")
        except NotFoundError as exc:
            raise HTTPException(status_code=404, detail=exc.message)
        except BusinessRuleError as exc:
            raise HTTPException(status_code=409, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)

    @post("/{proyecto_id:str}/sprints/{sprint_id:str}/reopen")
    async def reopen_sprint(
        self,
        proyecto_id: FromPath[str],
        sprint_id: FromPath[str],
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            result = await scrum.update_sprint_status(proyecto_id, sprint_id, "planned")
        except NotFoundError as exc:
            raise HTTPException(status_code=404, detail=exc.message)
        except BusinessRuleError as exc:
            raise HTTPException(status_code=409, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)

    @put("/{proyecto_id:str}/sprints/{sprint_id:str}/status")
    async def update_sprint_status(
        self,
        proyecto_id: FromPath[str],
        sprint_id: FromPath[str],
        data: UpdateStatusRequest,
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        status = data.status
        try:
            result = await scrum.update_sprint_status(proyecto_id, sprint_id, status)
        except (NotFoundError, ValidationError) as exc:
            raise HTTPException(status_code=400, detail=exc.message)
        except BusinessRuleError as exc:
            raise HTTPException(status_code=409, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)
