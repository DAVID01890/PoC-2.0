from __future__ import annotations


class DomainError(Exception):
    """Base exception for all domain errors."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class NotFoundError(DomainError):
    """Raised when an entity is not found."""

    def __init__(self, entity_name: str, entity_id: str) -> None:
        self.entity_name = entity_name
        self.entity_id = entity_id
        super().__init__(f"{entity_name} with id '{entity_id}' not found")


class ValidationError(DomainError):
    """Raised when domain validation fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message)


class BusinessRuleError(DomainError):
    """Raised when a business rule is violated."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
