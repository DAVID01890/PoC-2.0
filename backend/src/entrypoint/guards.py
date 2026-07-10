from litestar.connection import ASGIConnection
from litestar.exceptions import HTTPException
from litestar.handlers.base import BaseRouteHandler

from src.idp import IDPFacade
from src.scrum import ScrumFacade


async def require_admin(
    connection: ASGIConnection,
    handler: BaseRouteHandler,
) -> None:
    user = connection.user
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not IDPFacade.is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")


async def require_project_member(
    connection: ASGIConnection,
    handler: BaseRouteHandler,
) -> None:
    user = connection.user
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if IDPFacade.is_admin(user):
        return

    proyecto_id = connection.path_params.get("proyecto_id")
    if not proyecto_id:
        return

    scrum: ScrumFacade = connection.app.state.scrum
    proyecto = await scrum.get_proyecto(proyecto_id)
    if proyecto is None:
        raise HTTPException(status_code=404, detail="Proyecto not found")
    if user["id"] not in proyecto.get("miembros", {}):
        raise HTTPException(status_code=403, detail="Not a member of this project")


async def require_project_owner(
    connection: ASGIConnection,
    handler: BaseRouteHandler,
) -> None:
    user = connection.user
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if IDPFacade.is_admin(user):
        return

    proyecto_id = connection.path_params.get("proyecto_id")
    if not proyecto_id:
        return

    scrum: ScrumFacade = connection.app.state.scrum
    proyecto = await scrum.get_proyecto(proyecto_id)
    if proyecto is None:
        raise HTTPException(status_code=404, detail="Proyecto not found")
    if proyecto["miembros"].get(user["id"]) != "owner":
        raise HTTPException(
            status_code=403,
            detail="Solo el creador del proyecto (owner) o un administrador del sistema pueden gestionar los miembros y roles.",
        )
