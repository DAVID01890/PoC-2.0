from datetime import datetime, timezone

from src.shared_kernel.domain.base_events import DomainEvent
from src.shared_kernel.domain.base_value_objects import EntityId


class TestDomainEvent:
    def test_creates_with_defaults(self) -> None:
        event = DomainEvent()
        assert isinstance(event.event_id, EntityId)
        assert isinstance(event.occurred_at, datetime)

    def test_occurred_at_is_utc(self) -> None:
        event = DomainEvent()
        assert event.occurred_at.tzinfo is timezone.utc

    def test_accepts_explicit_event_id(self) -> None:
        eid = EntityId()
        event = DomainEvent(event_id=eid)
        assert event.event_id == eid

    def test_accepts_explicit_occurred_at(self) -> None:
        dt = datetime(2026, 1, 1, tzinfo=timezone.utc)
        event = DomainEvent(occurred_at=dt)
        assert event.occurred_at == dt

    def test_equality_by_event_id(self) -> None:
        eid = EntityId()
        event1 = DomainEvent(event_id=eid)
        event2 = DomainEvent(event_id=eid)
        assert event1 == event2

    def test_inequality(self) -> None:
        event1 = DomainEvent()
        event2 = DomainEvent()
        assert event1 != event2

    def test_hash(self) -> None:
        eid = EntityId()
        event1 = DomainEvent(event_id=eid)
        event2 = DomainEvent(event_id=eid)
        assert hash(event1) == hash(event2)

    def test_str(self) -> None:
        event = DomainEvent()
        assert str(event).startswith("DomainEvent(")

    def test_repr(self) -> None:
        event = DomainEvent()
        assert repr(event).startswith("DomainEvent(event_id=")
        assert "occurred_at=" in repr(event)

    def test_can_subclass(self) -> None:
        class UserCreated(DomainEvent):
            def __init__(self, user_id: EntityId) -> None:
                super().__init__()
                self.user_id = user_id

        e = UserCreated(EntityId())
        assert isinstance(e, DomainEvent)
        assert isinstance(e.event_id, EntityId)
        assert str(e).startswith("UserCreated(")
