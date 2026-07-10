from __future__ import annotations

from litestar import Controller, delete, post
from litestar.connection import ASGIConnection
from litestar.exceptions import HTTPException
from litestar.params import FromPath

from src.entrypoint.scrum.schemas import (
    AddMiembroRequest,
    ProyectoResponse,
)
from src.idp import IDPFacade
from src.scrum import ScrumFacade
from src.entrypoint.scrum.utils import _dict_to_response
from src.shared_kernel.domain.base_exceptions import BusinessRuleError, NotFoundError
from src.entrypoint.guards import require_project_owner


class MiembroController(Controller):
    path = "/proyectos"
    guards = [require_project_owner]

    @post("/{proyecto_id:str}/miembros")
    async def add_miembro(
        self,
        proyecto_id: FromPath[str],
        data: AddMiembroRequest,
        scrum: ScrumFacade,
    ) -> ProyectoResponse:
        try:
            result = await scrum.add_miembro(proyecto_id, data.usuario_id, data.rol)
        except (NotFoundError, BusinessRuleError) as exc:
            raise HTTPException(status_code=400, detail=exc.message)
        return _dict_to_response(result)

    @delete("/{proyecto_id:str}/miembros/{usuario_id:str}", status_code=200)
    async def remove_miembro(
        self,
        proyecto_id: FromPath[str],
        usuario_id: FromPath[str],
        scrum: ScrumFacade,
        request: ASGIConnection,
    ) -> ProyectoResponse:
        requester: dict = request.user
        if usuario_id == requester["id"]:
            raise HTTPException(
                status_code=400,
                detail="El owner/creador del proyecto no puede eliminarse a sí mismo.",
            )
        try:
            result = await scrum.remove_miembro(proyecto_id, usuario_id)
        except (NotFoundError, BusinessRuleError) as exc:
            raise HTTPException(status_code=400, detail=exc.message)
        return _dict_to_response(result)
