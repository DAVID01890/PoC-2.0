from __future__ import annotations

import re
from uuid import UUID, uuid4

from src.shared_kernel.domain.base_exceptions import ValidationError


class EntityId:
    _value: UUID

    def __init__(self, value: UUID | None = None) -> None:
        self._value = value if value is not None else uuid4()

    @property
    def value(self) -> UUID:
        return self._value

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, EntityId):
            return NotImplemented
        return self._value == other._value

    def __hash__(self) -> int:
        return hash(self._value)

    def __str__(self) -> str:
        return str(self._value)

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({str(self._value)})"


_EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


class Email:
    _value: str

    def __init__(self, value: str) -> None:
        if not _EMAIL_PATTERN.match(value):
            raise ValidationError(f"Invalid email: '{value}'")
        self._value = value

    @property
    def value(self) -> str:
        return self._value

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Email):
            return NotImplemented
        return self._value == other._value

    def __hash__(self) -> int:
        return hash(self._value)

    def __str__(self) -> str:
        return self._value

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self._value})"


class NotEmptyString:
    _value: str

    def __init__(self, value: str) -> None:
        stripped = value.strip()
        if not stripped:
            raise ValidationError("Value cannot be empty or whitespace")
        self._value = stripped

    @property
    def value(self) -> str:
        return self._value

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, NotEmptyString):
            return NotImplemented
        return self._value == other._value

    def __hash__(self) -> int:
        return hash(self._value)

    def __str__(self) -> str:
        return self._value

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self._value})"


class PositiveInt:
    _value: int

    def __init__(self, value: int) -> None:
        if value <= 0:
            raise ValidationError(f"Value must be positive, got {value}")
        self._value = value

    @property
    def value(self) -> int:
        return self._value

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, PositiveInt):
            return NotImplemented
        return self._value == other._value

    def __hash__(self) -> int:
        return hash(self._value)

    def __str__(self) -> str:
        return str(self._value)

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self._value})"
