import pytest

from src.idp.adapters.mock.identity_service_mock import IdentityServiceMock
from src.idp.domain.entities import Usuario
from src.idp.domain.value_objects import UserId, UserRole
from src.shared_kernel.domain.base_exceptions import (
    BusinessRuleError,
    NotFoundError,
)
from src.shared_kernel.domain.base_value_objects import Email, NotEmptyString


@pytest.fixture
def service() -> IdentityServiceMock:
    return IdentityServiceMock()


class TestCreateUser:
    def test_create_user(self, service: IdentityServiceMock) -> None:
        user = service.create_user(
            email=Email("alice@example.com"),
            name=NotEmptyString("Alice"),
        )
        assert isinstance(user, Usuario)
        assert user.email == Email("alice@example.com")
        assert user.name == NotEmptyString("Alice")
        assert user.role == UserRole.DEVELOPER

    def test_create_user_with_explicit_role(
        self, service: IdentityServiceMock
    ) -> None:
        user = service.create_user(
            email=Email("admin@example.com"),
            name=NotEmptyString("Admin"),
            role=UserRole.ADMIN,
        )
        assert user.role == UserRole.ADMIN

    def test_create_duplicate_email_raises_error(
        self, service: IdentityServiceMock
    ) -> None:
        service.create_user(
            email=Email("alice@example.com"),
            name=NotEmptyString("Alice"),
        )
        with pytest.raises(BusinessRuleError, match="already exists"):
            service.create_user(
                email=Email("alice@example.com"),
                name=NotEmptyString("Alice Dup"),
            )


class TestGetById:
    def test_get_existing_user(self, service: IdentityServiceMock) -> None:
        created = service.create_user(
            email=Email("bob@example.com"),
            name=NotEmptyString("Bob"),
        )
        found = service.get_by_id(created.id)
        assert found is not None
        assert found == created

    def test_get_nonexistent_user(
        self, service: IdentityServiceMock
    ) -> None:
        found = service.get_by_id(UserId())
        assert found is None


class TestGetByEmail:
    def test_get_existing_user(self, service: IdentityServiceMock) -> None:
        created = service.create_user(
            email=Email("carol@example.com"),
            name=NotEmptyString("Carol"),
        )
        found = service.get_by_email(Email("carol@example.com"))
        assert found is not None
        assert found == created

    def test_get_nonexistent_email(
        self, service: IdentityServiceMock
    ) -> None:
        found = service.get_by_email(Email("nobody@example.com"))
        assert found is None


class TestListUsers:
    def test_list_empty(self, service: IdentityServiceMock) -> None:
        assert service.list_users() == []

    def test_list_multiple_users(
        self, service: IdentityServiceMock
    ) -> None:
        service.create_user(
            email=Email("a@example.com"),
            name=NotEmptyString("A"),
        )
        service.create_user(
            email=Email("b@example.com"),
            name=NotEmptyString("B"),
        )
        users = service.list_users()
        assert len(users) == 2


class TestUpdateRole:
    def test_update_role(self, service: IdentityServiceMock) -> None:
        created = service.create_user(
            email=Email("dave@example.com"),
            name=NotEmptyString("Dave"),
            role=UserRole.DEVELOPER,
        )
        updated = service.update_role(created.id, UserRole.ADMIN)
        assert updated.role == UserRole.ADMIN

    def test_update_role_nonexistent_user(
        self, service: IdentityServiceMock
    ) -> None:
        with pytest.raises(NotFoundError):
            service.update_role(UserId(), UserRole.VIEWER)

    def test_update_role_persists(self, service: IdentityServiceMock) -> None:
        created = service.create_user(
            email=Email("eve@example.com"),
            name=NotEmptyString("Eve"),
            role=UserRole.VIEWER,
        )
        service.update_role(created.id, UserRole.DEVELOPER)
        fetched = service.get_by_id(created.id)
        assert fetched is not None
        assert fetched.role == UserRole.DEVELOPER
