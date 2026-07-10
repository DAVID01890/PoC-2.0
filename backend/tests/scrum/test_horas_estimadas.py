import pytest

from src.scrum.domain.value_objects import HorasEstimadas
from src.shared_kernel.domain.base_exceptions import ValidationError


class TestHorasEstimadasCreation:
    def test_valid_hours(self) -> None:
        for v in [1, 8, 24, 40]:
            h = HorasEstimadas(v)
            assert h.value == v

    def test_zero_raises_error(self) -> None:
        with pytest.raises(ValidationError, match="Horas must be positive"):
            HorasEstimadas(0)

    def test_negative_raises_error(self) -> None:
        with pytest.raises(ValidationError, match="Horas must be positive"):
            HorasEstimadas(-5)

    def test_exceeds_max_raises_error(self) -> None:
        with pytest.raises(ValidationError, match="Horas cannot exceed 40"):
            HorasEstimadas(41)


class TestHorasEstimadasEquality:
    def test_equality(self) -> None:
        assert HorasEstimadas(8) == HorasEstimadas(8)

    def test_inequality(self) -> None:
        assert HorasEstimadas(4) != HorasEstimadas(8)

    def test_hash(self) -> None:
        assert hash(HorasEstimadas(16)) == hash(HorasEstimadas(16))


class TestHorasEstimadasStr:
    def test_str(self) -> None:
        assert str(HorasEstimadas(8)) == "8"

    def test_repr(self) -> None:
        assert repr(HorasEstimadas(24)) == "HorasEstimadas(24)"
