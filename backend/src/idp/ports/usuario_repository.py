from __future__ import annotations

from abc import ABC, abstractmethod

from src.idp.domain.entities import Usuario
from src.idp.domain.value_objects import UserId
from src.shared_kernel.domain.base_value_objects import Email


class UsuarioRepository(ABC):
    @abstractmethod
    async def save(self, usuario: Usuario) -> None: ...

    @abstractmethod
    async def find_by_id(self, user_id: UserId) -> Usuario | None: ...

    @abstractmethod
    async def find_by_email(self, email: Email) -> Usuario | None: ...

    @abstractmethod
    async def list(self) -> list[Usuario]: ...

    @abstractmethod
    async def delete(self, user_id: UserId) -> None: ...
