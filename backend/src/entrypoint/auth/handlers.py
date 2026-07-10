from litestar import get, post, put, delete
from litestar.connection import ASGIConnection
from litestar.exceptions import HTTPException
from litestar.params import FromPath

from src.entrypoint.auth.guards import jwt_auth
from src.entrypoint.auth.schemas import LoginRequest, RegisterRequest, UpdateProfileRequest
from src.idp import IDPFacade
from src.idp.ports.usuario_repository import UsuarioRepository
from src.shared_kernel.domain.base_exceptions import BusinessRuleError, NotFoundError, ValidationError


@post("/login", exclude_from_auth=True)
async def login(
    data: LoginRequest,
    usuario_repo: UsuarioRepository,
) -> dict:
    facade = IDPFacade(usuario_repo)
    try:
        user = await facade.authenticate(data.email, data.password)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=exc.message)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = jwt_auth.create_token(identifier=user["id"])
    return {
        "access_token": token,
        "token_type": "Bearer",
        "user": user,
    }


@get("/me")
async def me(request: ASGIConnection) -> dict:
    user: dict = request.user
    return user


@put("/me")
async def update_profile(
    request: ASGIConnection,
    data: UpdateProfileRequest,
    usuario_repo: UsuarioRepository,
) -> dict:
    user: dict = request.user
    facade = IDPFacade(usuario_repo)
    try:
        updated = await facade.update_profile(
            user_id=user["id"],
            name=data.name,
            avatar=data.avatar,
            password=data.password,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=exc.message)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=exc.message)
    return updated


@post("/register", exclude_from_auth=True)
async def register(
    data: RegisterRequest,
    usuario_repo: UsuarioRepository,
) -> dict:
    facade = IDPFacade(usuario_repo)
    try:
        user = await facade.register_user(
            email=data.email,
            name=data.name,
            password=data.password,
        )
    except BusinessRuleError as exc:
        raise HTTPException(status_code=409, detail=exc.message)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=exc.message)
    token = jwt_auth.create_token(identifier=user["id"])
    return {
        "access_token": token,
        "token_type": "Bearer",
        "user": user,
    }


@get("/usuarios")
async def list_usuarios(
    usuario_repo: UsuarioRepository,
) -> list[dict]:
    facade = IDPFacade(usuario_repo)
    return await facade.list_users()


@put("/usuarios/{usuario_id:str}/password")
async def reset_password(
    usuario_id: FromPath[str],
    data: dict[str, str],
    usuario_repo: UsuarioRepository,
    request: ASGIConnection,
) -> dict:
    requester: dict | None = request.user
    if not requester:
        raise HTTPException(status_code=401, detail="Usuario no autenticado.")
    if requester.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Solo los administradores pueden restablecer contraseñas de otros usuarios.",
        )
    new_password = data.get("password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="La contraseña debe tener al menos 6 caracteres.",
        )
    facade = IDPFacade(usuario_repo)
    try:
        await facade.update_password(usuario_id, new_password)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=exc.message)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=exc.message)
    return {"status": "password_updated"}


@delete("/usuarios/{usuario_id:str}", status_code=200)
async def delete_usuario(
    usuario_id: FromPath[str],
    usuario_repo: UsuarioRepository,
    request: ASGIConnection,
) -> dict:
    requester: dict | None = request.user
    if not requester:
        raise HTTPException(status_code=401, detail="Usuario no autenticado.")
    if requester.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Solo los administradores pueden eliminar usuarios.",
        )
    if requester.get("id") == usuario_id:
        raise HTTPException(
            status_code=400,
            detail="No puedes eliminar tu propia cuenta.",
        )
    facade = IDPFacade(usuario_repo)
    try:
        await facade.delete_user(usuario_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=exc.message)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=exc.message)
    return {"status": "deleted"}
