from __future__ import annotations

from abc import ABC, abstractmethod

from src.idp.domain.entities import Usuario
from src.idp.domain.value_objects import UserId, UserRole
from src.shared_kernel.domain.base_value_objects import Email, NotEmptyString


class IdentityServicePort(ABC):
    @abstractmethod
    def create_user(
        self,
        email: Email,
        name: NotEmptyString,
        role: UserRole = UserRole.DEVELOPER,
    ) -> Usuario: ...

    @abstractmethod
    def get_by_id(self, user_id: UserId) -> Usuario | None: ...

    @abstractmethod
    def get_by_email(self, email: Email) -> Usuario | None: ...

    @abstractmethod
    def list_users(self) -> list[Usuario]: ...

    @abstractmethod
    def update_role(self, user_id: UserId, new_role: UserRole) -> Usuario: ...
