from __future__ import annotations

from abc import ABC, abstractmethod

from src.scrum.domain.entities import Proyecto, ProyectoId


class ProyectoRepository(ABC):
    @abstractmethod
    async def save(self, proyecto: Proyecto) -> None: ...

    @abstractmethod
    async def find_by_id(self, proyecto_id: ProyectoId) -> Proyecto | None: ...

    @abstractmethod
    async def delete(self, proyecto_id: ProyectoId) -> None: ...

    @abstractmethod
    async def list(self) -> list[Proyecto]: ...
