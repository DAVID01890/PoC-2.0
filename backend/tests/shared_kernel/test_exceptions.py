import pytest

from src.shared_kernel.domain.base_exceptions import (
    BusinessRuleError,
    DomainError,
    NotFoundError,
    ValidationError,
)


def test_domain_error_is_exception() -> None:
    error = DomainError("something went wrong")
    assert isinstance(error, Exception)
    assert str(error) == "something went wrong"
    assert error.message == "something went wrong"


def test_not_found_error_format() -> None:
    error = NotFoundError(entity_name="User", entity_id="123")
    assert isinstance(error, DomainError)
    assert str(error) == "User with id '123' not found"
    assert error.entity_name == "User"
    assert error.entity_id == "123"


def test_validation_error() -> None:
    error = ValidationError("invalid email")
    assert isinstance(error, DomainError)
    assert str(error) == "invalid email"


def test_business_rule_error() -> None:
    error = BusinessRuleError("sprint cannot be closed with open tasks")
    assert isinstance(error, DomainError)
    assert str(error) == "sprint cannot be closed with open tasks"


def test_all_errors_can_be_caught_as_domain_error() -> None:
    errors: list[DomainError] = [
        NotFoundError("Project", "1"),
        ValidationError("bad value"),
        BusinessRuleError("rule broken"),
    ]
    for error in errors:
        with pytest.raises(DomainError):
            raise error
