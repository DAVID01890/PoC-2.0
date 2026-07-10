import pytest

from src.shared_kernel.domain.base_exceptions import ValidationError
from src.shared_kernel.domain.base_value_objects import (
    Email,
    NotEmptyString,
    PositiveInt,
)


class TestEmail:
    def test_valid_email(self) -> None:
        email = Email("user@example.com")
        assert email.value == "user@example.com"

    def test_valid_email_with_plus(self) -> None:
        email = Email("user+tag@example.co.uk")
        assert email.value == "user+tag@example.co.uk"

    def test_invalid_email_without_at(self) -> None:
        with pytest.raises(ValidationError, match="Invalid email"):
            Email("userexample.com")

    def test_invalid_email_without_domain(self) -> None:
        with pytest.raises(ValidationError, match="Invalid email"):
            Email("user@")

    def test_invalid_email_empty(self) -> None:
        with pytest.raises(ValidationError, match="Invalid email"):
            Email("")

    def test_equality(self) -> None:
        assert Email("a@b.com") == Email("a@b.com")

    def test_inequality(self) -> None:
        assert Email("a@b.com") != Email("c@d.com")

    def test_hash(self) -> None:
        assert hash(Email("a@b.com")) == hash(Email("a@b.com"))

    def test_str(self) -> None:
        assert str(Email("a@b.com")) == "a@b.com"


class TestNotEmptyString:
    def test_valid_string(self) -> None:
        s = NotEmptyString("hello")
        assert s.value == "hello"

    def test_strips_whitespace(self) -> None:
        s = NotEmptyString("  hello  ")
        assert s.value == "hello"

    def test_empty_string_raises_error(self) -> None:
        with pytest.raises(ValidationError, match="cannot be empty"):
            NotEmptyString("")

    def test_whitespace_only_raises_error(self) -> None:
        with pytest.raises(ValidationError, match="cannot be empty"):
            NotEmptyString("   ")

    def test_equality(self) -> None:
        assert NotEmptyString("foo") == NotEmptyString("foo")

    def test_inequality(self) -> None:
        assert NotEmptyString("foo") != NotEmptyString("bar")

    def test_hash(self) -> None:
        assert hash(NotEmptyString("foo")) == hash(NotEmptyString("foo"))

    def test_str(self) -> None:
        assert str(NotEmptyString("foo")) == "foo"


class TestPositiveInt:
    def test_valid_positive(self) -> None:
        n = PositiveInt(42)
        assert n.value == 42

    def test_zero_raises_error(self) -> None:
        with pytest.raises(ValidationError, match="positive"):
            PositiveInt(0)

    def test_negative_raises_error(self) -> None:
        with pytest.raises(ValidationError, match="positive"):
            PositiveInt(-5)

    def test_equality(self) -> None:
        assert PositiveInt(10) == PositiveInt(10)

    def test_inequality(self) -> None:
        assert PositiveInt(10) != PositiveInt(20)

    def test_hash(self) -> None:
        assert hash(PositiveInt(10)) == hash(PositiveInt(10))

    def test_str(self) -> None:
        assert str(PositiveInt(42)) == "42"
