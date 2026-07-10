"""Fachada pública del módulo Identity Provider (idp).

Toda la lógica relacionada con usuarios se accede a través de IDPFacade.
Los módulos externos NO deben importar desde src.idp.domain directamente.
"""
from __future__ import annotations

from uuid import UUID

from src.idp.domain.entities import Usuario
from src.idp.domain.value_objects import UserId, UserRole
from src.idp.ports.usuario_repository import UsuarioRepository
from src.shared_kernel.domain.base_exceptions import (
    BusinessRuleError,
    NotFoundError,
    ValidationError,
)
from src.shared_kernel.domain.base_value_objects import Email, NotEmptyString


class IDPFacade:
    """Fachada pública del módulo Identity Provider."""

    def __init__(self, usuario_repo: UsuarioRepository) -> None:
        self._usuario_repo = usuario_repo

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------

    async def authenticate(self, email: str, password: str) -> dict | None:
        """Verifica credenciales y retorna el dict del usuario o None."""
        # Email lanza ValidationError si el formato es incorrecto y se propaga al handler
        email_vo = Email(email)
        user = await self._usuario_repo.find_by_email(email_vo)
        if user is None or not user.verify_password(password) or not user.is_active:
            return None
        return self._user_to_dict(user)

    async def register_user(
        self,
        email: str,
        name: str,
        password: str,
        role: str = "developer",
    ) -> dict:
        """Registra un nuevo usuario. Lanza BusinessRuleError si el email ya existe."""
        try:
            email_vo = Email(email)
            name_vo = NotEmptyString(name)
            role_vo = UserRole(role)
        except (ValueError, ValidationError) as exc:
            raise ValidationError(str(exc)) from exc

        existing = await self._usuario_repo.find_by_email(email_vo)
        if existing is not None:
            raise BusinessRuleError(f"El email '{email}' ya está registrado")

        user = Usuario(email=email_vo, name=name_vo, role=role_vo)
        user.set_password(password)
        await self._usuario_repo.save(user)
        return self._user_to_dict(user)

    # ------------------------------------------------------------------
    # Consultas
    # ------------------------------------------------------------------

    async def get_user(self, user_id: str) -> dict | None:
        """Retorna el dict del usuario o None si no existe."""
        try:
            uid = UserId(UUID(user_id))
        except ValueError:
            return None
        user = await self._usuario_repo.find_by_id(uid)
        return self._user_to_dict(user) if user else None

    async def list_users(self) -> list[dict]:
        """Retorna todos los usuarios como lista de dicts."""
        users = await self._usuario_repo.list()
        return [self._user_to_dict(u) for u in users]

    # ------------------------------------------------------------------
    # Mutaciones
    # ------------------------------------------------------------------

    async def update_profile(
        self,
        user_id: str,
        name: str | None = None,
        avatar: str | None = None,
        password: str | None = None,
    ) -> dict:
        """Actualiza nombre, avatar y/o contraseña del usuario."""
        try:
            uid = UserId(UUID(user_id))
        except ValueError:
            raise ValidationError("ID de usuario inválido")

        user = await self._usuario_repo.find_by_id(uid)
        if user is None:
            raise NotFoundError("Usuario", user_id)

        if name is not None:
            user.update_profile(name=NotEmptyString(name))
        if avatar is not None:
            user.update_profile(avatar=avatar)
        if password is not None:
            if len(password) < 6:
                raise ValidationError("La contraseña debe tener al menos 6 caracteres")
            user.set_password(password)

        await self._usuario_repo.save(user)
        return self._user_to_dict(user)

    async def update_password(self, user_id: str, new_password: str) -> None:
        """Cambia la contraseña de cualquier usuario (operación admin)."""
        if len(new_password) < 6:
            raise ValidationError("La contraseña debe tener al menos 6 caracteres")
        try:
            uid = UserId(UUID(user_id))
        except ValueError:
            raise ValidationError("ID de usuario inválido")

        user = await self._usuario_repo.find_by_id(uid)
        if user is None:
            raise NotFoundError("Usuario", user_id)

        user.set_password(new_password)
        await self._usuario_repo.save(user)

    async def delete_user(self, user_id: str) -> bool:
        """Elimina un usuario del sistema (operación exclusiva de admin)."""
        try:
            uid = UserId(UUID(user_id))
        except ValueError:
            raise ValidationError("ID de usuario inválido")

        user = await self._usuario_repo.find_by_id(uid)
        if user is None:
            raise NotFoundError("Usuario", user_id)

        await self._usuario_repo.delete(uid)
        return True


    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _user_to_dict(user: Usuario) -> dict:
        return {
            "id": str(user.id),
            "email": str(user.email),
            "name": str(user.name),
            "role": user.role.value,
            "avatar": user.avatar,
            "is_active": user.is_active,
        }

    @staticmethod
    def is_admin(user_dict: dict | None) -> bool:
        """Comprueba si un user dict pertenece a un administrador."""
        return user_dict is not None and user_dict.get("role") == "admin"
