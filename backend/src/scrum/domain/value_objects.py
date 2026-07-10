from __future__ import annotations

from src.shared_kernel.domain.base_exceptions import ValidationError

_VALID_FIBONACCI_VALUES = frozenset({1, 2, 3, 5, 8, 13, 21})
_MAX_HORAS = 40


class HorasEstimadas:
    _value: int

    def __init__(self, value: int) -> None:
        if value <= 0:
            raise ValidationError(f"Horas must be positive, got {value}")
        if value > _MAX_HORAS:
            raise ValidationError(
                f"Horas cannot exceed {_MAX_HORAS}, got {value}"
            )
        self._value = value

    @property
    def value(self) -> int:
        return self._value

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, HorasEstimadas):
            return NotImplemented
        return self._value == other._value

    def __hash__(self) -> int:
        return hash(self._value)

    def __str__(self) -> str:
        return str(self._value)

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self._value})"


class StoryPoint:
    _value: int

    def __init__(self, value: int) -> None:
        if value not in _VALID_FIBONACCI_VALUES:
            valid = sorted(_VALID_FIBONACCI_VALUES)
            raise ValidationError(
                f"StoryPoint must be one of {valid}, got {value}"
            )
        self._value = value

    @property
    def value(self) -> int:
        return self._value

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, StoryPoint):
            return NotImplemented
        return self._value == other._value

    def __hash__(self) -> int:
        return hash(self._value)

    def __str__(self) -> str:
        return str(self._value)

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self._value})"
