from litestar import Router

from src.entrypoint.auth.handlers import login, register, me, update_profile
from src.entrypoint.auth.handlers import list_usuarios, reset_password, delete_usuario

auth_router = Router(
    path="/auth",
    route_handlers=[login, register, me, update_profile],
)

usuarios_router = Router(
    path="/",
    route_handlers=[list_usuarios, reset_password, delete_usuario],
)
