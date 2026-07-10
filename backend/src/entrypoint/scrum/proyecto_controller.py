from __future__ import annotations

from litestar import Controller, delete, get, post, put
from litestar.connection import ASGIConnection
from litestar.exceptions import HTTPException
from litestar.params import FromPath

from src.entrypoint.scrum.schemas import (
    CreateProyectoRequest,
    ProyectoResponse,
    UpdateProyectoRequest,
)
from src.idp import IDPFacade
from src.scrum import ScrumFacade
from src.entrypoint.scrum.utils import _dict_to_response
from src.shared_kernel.domain.base_exceptions import BusinessRuleError, ValidationError


class ProyectoController(Controller):
    path = "/proyectos"

    @post()
    async def create_proyecto(
        self,
        data: CreateProyectoRequest,
        scrum: ScrumFacade,
        request: ASGIConnection,
    ) -> ProyectoResponse:
        user: dict = request.user
        try:
            result = await scrum.create_proyecto(
                nombre=data.nombre,
                descripcion=data.descripcion,
                creator_id=user["id"] if user else None,
            )
        except (ValidationError, BusinessRuleError) as exc:
            raise HTTPException(status_code=400, detail=exc.message)
        return _dict_to_response(result)

    @put("/{proyecto_id:str}")
    async def update_proyecto(
        self,
        proyecto_id: FromPath[str],
        data: UpdateProyectoRequest,
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            result = await scrum.update_proyecto(proyecto_id, data.nombre, data.descripcion)
        except ValidationError as exc:
            raise HTTPException(status_code=400, detail=exc.message)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)

    @get()
    async def list_proyectos(
        self,
        scrum: ScrumFacade,
        request: ASGIConnection,
    ) -> list[ProyectoResponse]:
        user: dict = request.user
        proyectos = await scrum.list_proyectos()
        if user and IDPFacade.is_admin(user):
            filtered = proyectos
        else:
            filtered = [p for p in proyectos if user and user["id"] in p["miembros"]]
        return [_dict_to_response(p) for p in filtered]

    @get("/{proyecto_id:str}")
    async def get_proyecto(
        self,
        proyecto_id: FromPath[str],
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        result = await scrum.get_proyecto(proyecto_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return _dict_to_response(result)

    @delete("/{proyecto_id:str}", status_code=200)
    async def delete_proyecto(
        self,
        proyecto_id: FromPath[str],
        scrum: ScrumFacade,
    ) -> dict[str, str]:
        deleted = await scrum.delete_proyecto(proyecto_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Proyecto not found")
        return {"status": "deleted"}
