from __future__ import annotations

import bcrypt

from src.shared_kernel.domain.base_exceptions import BusinessRuleError
from src.shared_kernel.domain.base_value_objects import Email, NotEmptyString
from src.idp.domain.value_objects import UserId, UserRole


class Usuario:
    _id: UserId
    _email: Email
    _name: NotEmptyString
    _role: UserRole
    _is_active: bool
    _password_hash: str | None
    _avatar: str | None

    def __init__(
        self,
        email: Email,
        name: NotEmptyString,
        role: UserRole = UserRole.DEVELOPER,
        id: UserId | None = None,
        is_active: bool = True,
        password_hash: str | None = None,
        avatar: str | None = None,
    ) -> None:
        self._id = id if id is not None else UserId()
        self._email = email
        self._name = name
        self._role = role
        self._is_active = is_active
        self._password_hash = password_hash
        self._avatar = avatar

    @property
    def id(self) -> UserId:
        return self._id

    @property
    def email(self) -> Email:
        return self._email

    @property
    def name(self) -> NotEmptyString:
        return self._name

    @property
    def role(self) -> UserRole:
        return self._role

    @property
    def is_active(self) -> bool:
        return self._is_active

    @property
    def password_hash(self) -> str | None:
        return self._password_hash

    @property
    def avatar(self) -> str | None:
        return self._avatar

    def update_profile(self, name: NotEmptyString | None = None, avatar: str | None = None) -> None:
        if name is not None:
            self._name = name
        if avatar is not None:
            self._avatar = avatar

    def change_avatar(self, avatar: str | None) -> None:
        self._avatar = avatar

    def set_password(self, password: str) -> None:
        self._password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def verify_password(self, password: str) -> bool:
        if self._password_hash is None:
            return False
        return bcrypt.checkpw(
            password.encode("utf-8"),
            self._password_hash.encode("utf-8"),
        )

    def activate(self) -> None:
        if self._is_active:
            raise BusinessRuleError("User is already active")
        self._is_active = True

    def deactivate(self) -> None:
        if not self._is_active:
            raise BusinessRuleError("User is already inactive")
        self._is_active = False

    def change_role(self, new_role: UserRole) -> None:
        if new_role == self._role:
            raise BusinessRuleError(
                f"User already has role '{new_role.value}'"
            )
        self._role = new_role

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Usuario):
            return NotImplemented
        return self._id == other._id

    def __hash__(self) -> int:
        return hash(self._id)

    def __str__(self) -> str:
        return f"Usuario({self._id}, {self._email})"

    def __repr__(self) -> str:
        return (
            f"Usuario("
            f"id={self._id!r}, "
            f"email={self._email!r}, "
            f"role={self._role!r})"
        )
