from __future__ import annotations

from src.idp.domain.entities import Usuario
from src.idp.domain.value_objects import UserId, UserRole
from src.idp.ports.identity_service_port import IdentityServicePort
from src.shared_kernel.domain.base_exceptions import NotFoundError
from src.shared_kernel.domain.base_value_objects import Email, NotEmptyString


class IdentityServiceMock(IdentityServicePort):
    _users: dict[str, Usuario]

    def __init__(self) -> None:
        self._users = {}

    def create_user(
        self,
        email: Email,
        name: NotEmptyString,
        role: UserRole = UserRole.DEVELOPER,
    ) -> Usuario:
        existing = self.get_by_email(email)
        if existing is not None:
            from src.shared_kernel.domain.base_exceptions import (
                BusinessRuleError,
            )

            raise BusinessRuleError(
                f"User with email '{email}' already exists"
            )
        user = Usuario(email=email, name=name, role=role)
        self._users[str(user.id)] = user
        return user

    def get_by_id(self, user_id: UserId) -> Usuario | None:
        return self._users.get(str(user_id))

    def get_by_email(self, email: Email) -> Usuario | None:
        for user in self._users.values():
            if user.email == email:
                return user
        return None

    def list_users(self) -> list[Usuario]:
        return list(self._users.values())

    def update_role(self, user_id: UserId, new_role: UserRole) -> Usuario:
        user = self.get_by_id(user_id)
        if user is None:
            raise NotFoundError("Usuario", str(user_id))
        user.change_role(new_role)
        return user
