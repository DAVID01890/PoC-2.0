import pytest

from src.scrum.domain.entities import HistoriaDeUsuario, HistoriaId, HistoriaStatus
from src.scrum.domain.value_objects import StoryPoint
from src.shared_kernel.domain.base_exceptions import BusinessRuleError
from src.shared_kernel.domain.base_value_objects import NotEmptyString


class TestHistoriaDeUsuarioCreation:
    def test_create_with_required_fields(self) -> None:
        h = HistoriaDeUsuario(
            title=NotEmptyString("Login page"),
            story_points=StoryPoint(5),
        )
        assert isinstance(h.id, HistoriaId)
        assert h.title == NotEmptyString("Login page")
        assert h.story_points == StoryPoint(5)
        assert h.description is None
        assert h.status == HistoriaStatus.PENDING

    def test_create_with_description(self) -> None:
        h = HistoriaDeUsuario(
            title=NotEmptyString("Search"),
            story_points=StoryPoint(8),
            description="User can search by keyword",
        )
        assert h.description == "User can search by keyword"

    def test_create_with_explicit_status(self) -> None:
        h = HistoriaDeUsuario(
            title=NotEmptyString("Done task"),
            story_points=StoryPoint(1),
            status=HistoriaStatus.DONE,
        )
        assert h.status == HistoriaStatus.DONE

    def test_create_with_explicit_id(self) -> None:
        hid = HistoriaId()
        h = HistoriaDeUsuario(
            id=hid,
            title=NotEmptyString("Test"),
            story_points=StoryPoint(3),
        )
        assert h.id == hid


class TestHistoriaWorkflow:
    def test_start_work(self) -> None:
        h = HistoriaDeUsuario(
            title=NotEmptyString("Feature X"),
            story_points=StoryPoint(13),
        )
        h.start_work()
        assert h.status == HistoriaStatus.IN_PROGRESS

    def test_complete(self) -> None:
        h = HistoriaDeUsuario(
            title=NotEmptyString("Feature X"),
            story_points=StoryPoint(13),
        )
        h.start_work()
        h.complete()
        assert h.status == HistoriaStatus.DONE

    def test_reopen(self) -> None:
        h = HistoriaDeUsuario(
            title=NotEmptyString("Feature X"),
            story_points=StoryPoint(13),
        )
        h.start_work()
        h.complete()
        h.reopen()
        assert h.status == HistoriaStatus.PENDING


class TestHistoriaWorkflowErrors:
    def test_start_work_from_in_progress_raises_error(self) -> None:
        h = HistoriaDeUsuario(
            title=NotEmptyString("Feature"),
            story_points=StoryPoint(5),
        )
        h.start_work()
        with pytest.raises(BusinessRuleError, match="in_progress"):
            h.start_work()

    def test_complete_from_pending_raises_error(self) -> None:
        h = HistoriaDeUsuario(
            title=NotEmptyString("Feature"),
            story_points=StoryPoint(5),
        )
        with pytest.raises(BusinessRuleError, match="pending"):
            h.complete()

    def test_complete_from_done_raises_error(self) -> None:
        h = HistoriaDeUsuario(
            title=NotEmptyString("Feature"),
            story_points=StoryPoint(5),
        )
        h.start_work()
        h.complete()
        with pytest.raises(BusinessRuleError, match="done"):
            h.complete()

    def test_reopen_from_pending_raises_error(self) -> None:
        h = HistoriaDeUsuario(
            title=NotEmptyString("Feature"),
            story_points=StoryPoint(5),
        )
        with pytest.raises(BusinessRuleError, match="pending"):
            h.reopen()

    def test_reopen_from_in_progress_raises_error(self) -> None:
        h = HistoriaDeUsuario(
            title=NotEmptyString("Feature"),
            story_points=StoryPoint(5),
        )
        h.start_work()
        with pytest.raises(BusinessRuleError, match="in_progress"):
            h.reopen()


class TestHistoriaEquality:
    def test_equality_by_id(self) -> None:
        hid = HistoriaId()
        h1 = HistoriaDeUsuario(
            id=hid,
            title=NotEmptyString("A"),
            story_points=StoryPoint(3),
        )
        h2 = HistoriaDeUsuario(
            id=hid,
            title=NotEmptyString("B"),
            story_points=StoryPoint(5),
        )
        assert h1 == h2

    def test_inequality(self) -> None:
        h1 = HistoriaDeUsuario(
            title=NotEmptyString("A"),
            story_points=StoryPoint(3),
        )
        h2 = HistoriaDeUsuario(
            title=NotEmptyString("B"),
            story_points=StoryPoint(5),
        )
        assert h1 != h2

    def test_hash(self) -> None:
        hid = HistoriaId()
        h1 = HistoriaDeUsuario(
            id=hid,
            title=NotEmptyString("A"),
            story_points=StoryPoint(3),
        )
        h2 = HistoriaDeUsuario(
            id=hid,
            title=NotEmptyString("B"),
            story_points=StoryPoint(5),
        )
        assert hash(h1) == hash(h2)


class TestHistoriaStr:
    def test_str(self) -> None:
        h = HistoriaDeUsuario(
            title=NotEmptyString("Homepage"),
            story_points=StoryPoint(2),
        )
        assert str(h).startswith("HistoriaDeUsuario(")

    def test_repr(self) -> None:
        h = HistoriaDeUsuario(
            title=NotEmptyString("Homepage"),
            story_points=StoryPoint(2),
        )
        assert repr(h).startswith("HistoriaDeUsuario(id=")
        assert "points=" in repr(h)
