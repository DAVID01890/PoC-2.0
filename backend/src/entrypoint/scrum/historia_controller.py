from __future__ import annotations

from litestar import Controller, delete, post, put
from litestar.exceptions import HTTPException
from litestar.params import FromPath

from src.entrypoint.scrum.schemas import (
    CreateHistoriaRequest,
    ProyectoResponse,
    UpdateHistoriaRequest,
    UpdateStatusRequest,
)
from src.scrum import ScrumFacade
from src.entrypoint.scrum.utils import _dict_to_response
from src.shared_kernel.domain.base_exceptions import BusinessRuleError, NotFoundError, ValidationError
from src.entrypoint.guards import require_project_member


class HistoriaController(Controller):
    path = "/proyectos"
    guards = [require_project_member]

    @post("/{proyecto_id:str}/historias")
    async def add_historia(
        self,
        proyecto_id: FromPath[str],
        data: CreateHistoriaRequest,
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            result = await scrum.add_historia(
                proyecto_id, data.titulo, data.story_points, data.descripcion, data.asignado_a
            )
        except ValidationError as exc:
            raise HTTPException(status_code=400, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)

    @put("/{proyecto_id:str}/historias/{historia_id:str}")
    async def update_historia(
        self,
        proyecto_id: FromPath[str],
        historia_id: FromPath[str],
        data: UpdateHistoriaRequest,
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            clear_asignado = (data.asignado_a == "")
            asignado_val = None if clear_asignado or data.asignado_a is None else data.asignado_a
            result = await scrum.update_historia(
                proyecto_id,
                historia_id,
                titulo=data.titulo,
                story_points=data.story_points,
                descripcion=data.descripcion,
                asignado_a=asignado_val,
                clear_asignado=clear_asignado,
            )
        except (NotFoundError, ValidationError) as exc:
            raise HTTPException(status_code=400, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)

    @delete("/{proyecto_id:str}/historias/{historia_id:str}", status_code=200)
    async def delete_historia(
        self,
        proyecto_id: FromPath[str],
        historia_id: FromPath[str],
        scrum: ScrumFacade,
    ) -> dict:
        try:
            deleted = await scrum.delete_historia(proyecto_id, historia_id)
        except (NotFoundError, BusinessRuleError) as exc:
            raise HTTPException(status_code=404, detail=exc.message)
        if not deleted:
            raise HTTPException(status_code=404, detail="Historia not found")
        return {"status": "deleted"}

    @put("/{proyecto_id:str}/historias/{historia_id:str}/status")
    async def update_historia_status(
         self,
         proyecto_id: FromPath[str],
         historia_id: FromPath[str],
         data: UpdateStatusRequest,
         scrum: ScrumFacade,
     ) -> ProyectoResponse:
         status_str = data.status
         if status_str == "completed":
             status_str = "done"
         try:
             result = await scrum.update_historia(
                 proyecto_id, historia_id, status=status_str
             )
         except (NotFoundError, ValidationError) as exc:
             raise HTTPException(status_code=400, detail=exc.message)
         if result is None:
             raise HTTPException(status_code=404, detail="Proyecto not found")
         return _dict_to_response(result)
