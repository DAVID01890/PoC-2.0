from __future__ import annotations

from enum import Enum

from src.shared_kernel.domain.base_value_objects import EntityId


class UserId(EntityId):
    pass


class UserRole(Enum):
    ADMIN = "admin"
    DEVELOPER = "developer"
    VIEWER = "viewer"
