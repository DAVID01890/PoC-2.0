from uuid import UUID, uuid4

from src.shared_kernel.domain.base_value_objects import EntityId


def test_entity_id_generates_uuid_on_creation() -> None:
    entity_id = EntityId()
    assert isinstance(entity_id.value, UUID)


def test_entity_id_accepts_explicit_uuid() -> None:
    uid = uuid4()
    entity_id = EntityId(value=uid)
    assert entity_id.value == uid


def test_entity_id_equality() -> None:
    uid = uuid4()
    id1 = EntityId(value=uid)
    id2 = EntityId(value=uid)
    assert id1 == id2


def test_entity_id_inequality() -> None:
    id1 = EntityId()
    id2 = EntityId()
    assert id1 != id2


def test_entity_id_hash() -> None:
    uid = uuid4()
    id1 = EntityId(value=uid)
    id2 = EntityId(value=uid)
    assert hash(id1) == hash(id2)


def test_entity_id_str_representation() -> None:
    uid = uuid4()
    entity_id = EntityId(value=uid)
    assert str(entity_id) == str(uid)


def test_entity_id_repr() -> None:
    uid = uuid4()
    entity_id = EntityId(value=uid)
    assert repr(entity_id) == f"EntityId({str(uid)})"
