import pytest

from src.idp.domain.entities import Usuario
from src.idp.domain.value_objects import UserId, UserRole
from src.shared_kernel.domain.base_exceptions import BusinessRuleError
from src.shared_kernel.domain.base_value_objects import Email, NotEmptyString


class TestUsuarioCreation:
    def test_create_usuario_with_defaults(self) -> None:
        user = Usuario(
            email=Email("user@example.com"),
            name=NotEmptyString("Alice"),
        )
        assert isinstance(user.id, UserId)
        assert user.email == Email("user@example.com")
        assert user.name == NotEmptyString("Alice")
        assert user.role == UserRole.DEVELOPER
        assert user.is_active is True

    def test_create_usuario_with_explicit_role(self) -> None:
        user = Usuario(
            email=Email("admin@example.com"),
            name=NotEmptyString("Admin"),
            role=UserRole.ADMIN,
        )
        assert user.role == UserRole.ADMIN

    def test_create_usuario_with_explicit_id(self) -> None:
        uid = UserId()
        user = Usuario(
            id=uid,
            email=Email("user@example.com"),
            name=NotEmptyString("Bob"),
        )
        assert user.id == uid


class TestUsuarioActivation:
    def test_deactivate_user(self) -> None:
        user = Usuario(
            email=Email("user@example.com"),
            name=NotEmptyString("Charlie"),
        )
        user.deactivate()
        assert user.is_active is False

    def test_activate_user(self) -> None:
        user = Usuario(
            email=Email("user@example.com"),
            name=NotEmptyString("Charlie"),
            is_active=False,
        )
        user.activate()
        assert user.is_active is True

    def test_deactivate_already_inactive_raises_error(self) -> None:
        user = Usuario(
            email=Email("user@example.com"),
            name=NotEmptyString("Charlie"),
            is_active=False,
        )
        with pytest.raises(BusinessRuleError, match="already inactive"):
            user.deactivate()

    def test_activate_already_active_raises_error(self) -> None:
        user = Usuario(
            email=Email("user@example.com"),
            name=NotEmptyString("Charlie"),
        )
        with pytest.raises(BusinessRuleError, match="already active"):
            user.activate()


class TestUsuarioRoleChange:
    def test_change_role(self) -> None:
        user = Usuario(
            email=Email("user@example.com"),
            name=NotEmptyString("Diana"),
            role=UserRole.DEVELOPER,
        )
        user.change_role(UserRole.ADMIN)
        assert user.role == UserRole.ADMIN

    def test_change_to_same_role_raises_error(self) -> None:
        user = Usuario(
            email=Email("user@example.com"),
            name=NotEmptyString("Diana"),
            role=UserRole.VIEWER,
        )
        with pytest.raises(BusinessRuleError, match="already has role"):
            user.change_role(UserRole.VIEWER)


class TestUsuarioEquality:
    def test_equality_by_id(self) -> None:
        uid = UserId()
        user1 = Usuario(
            id=uid,
            email=Email("a@b.com"),
            name=NotEmptyString("A"),
        )
        user2 = Usuario(
            id=uid,
            email=Email("x@y.com"),
            name=NotEmptyString("X"),
        )
        assert user1 == user2

    def test_inequality(self) -> None:
        user1 = Usuario(
            email=Email("a@b.com"),
            name=NotEmptyString("A"),
        )
        user2 = Usuario(
            email=Email("x@y.com"),
            name=NotEmptyString("X"),
        )
        assert user1 != user2

    def test_hash(self) -> None:
        uid = UserId()
        user1 = Usuario(
            id=uid,
            email=Email("a@b.com"),
            name=NotEmptyString("A"),
        )
        user2 = Usuario(
            id=uid,
            email=Email("x@y.com"),
            name=NotEmptyString("X"),
        )
        assert hash(user1) == hash(user2)


class TestUsuarioStr:
    def test_str(self) -> None:
        user = Usuario(
            email=Email("user@example.com"),
            name=NotEmptyString("Eve"),
        )
        assert str(user).startswith("Usuario(")

    def test_repr(self) -> None:
        user = Usuario(
            email=Email("user@example.com"),
            name=NotEmptyString("Eve"),
            role=UserRole.ADMIN,
        )
        assert repr(user).startswith("Usuario(id=")
        assert "role=" in repr(user)
