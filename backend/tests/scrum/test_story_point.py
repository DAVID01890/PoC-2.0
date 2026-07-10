import pytest

from src.scrum.domain.value_objects import StoryPoint
from src.shared_kernel.domain.base_exceptions import ValidationError


class TestStoryPointCreation:
    def test_valid_fibonacci_values(self) -> None:
        for v in [1, 2, 3, 5, 8, 13, 21]:
            sp = StoryPoint(v)
            assert sp.value == v

    def test_invalid_value_raises_error(self) -> None:
        with pytest.raises(ValidationError, match="StoryPoint must be one of"):
            StoryPoint(4)

    def test_zero_raises_error(self) -> None:
        with pytest.raises(ValidationError, match="StoryPoint must be one of"):
            StoryPoint(0)

    def test_negative_raises_error(self) -> None:
        with pytest.raises(ValidationError, match="StoryPoint must be one of"):
            StoryPoint(-1)

    def test_large_number_raises_error(self) -> None:
        with pytest.raises(ValidationError, match="StoryPoint must be one of"):
            StoryPoint(100)


class TestStoryPointEquality:
    def test_equality(self) -> None:
        assert StoryPoint(5) == StoryPoint(5)

    def test_inequality(self) -> None:
        assert StoryPoint(3) != StoryPoint(5)

    def test_hash(self) -> None:
        assert hash(StoryPoint(8)) == hash(StoryPoint(8))


class TestStoryPointStr:
    def test_str(self) -> None:
        assert str(StoryPoint(13)) == "13"

    def test_repr(self) -> None:
        assert repr(StoryPoint(21)) == "StoryPoint(21)"
