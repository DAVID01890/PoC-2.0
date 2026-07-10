import pytest

from src.scrum.domain.entities import (
    HistoriaDeUsuario,
    Proyecto,
    ProyectoId,
    Sprint,
    SprintId,
    SprintStatus,
)
from src.scrum.domain.value_objects import StoryPoint
from src.shared_kernel.domain.base_exceptions import BusinessRuleError, NotFoundError
from src.shared_kernel.domain.base_value_objects import NotEmptyString


@pytest.fixture
def historia() -> HistoriaDeUsuario:
    return HistoriaDeUsuario(
        title=NotEmptyString("Feature X"),
        story_points=StoryPoint(5),
    )


@pytest.fixture
def proyecto() -> Proyecto:
    return Proyecto(nombre=NotEmptyString("My Project"))


class TestSprintCreation:
    def test_create_with_required_fields(self) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint 1"))
        assert isinstance(s.id, SprintId)
        assert s.nombre == NotEmptyString("Sprint 1")
        assert s.status == SprintStatus.PLANNED
        assert s.fecha_inicio is None
        assert s.fecha_fin is None
        assert s.backlog == []

    def test_create_with_explicit_status(self) -> None:
        s = Sprint(
            nombre=NotEmptyString("Closed Sprint"),
            status=SprintStatus.CLOSED,
        )
        assert s.status == SprintStatus.CLOSED

    def test_create_with_explicit_id(self) -> None:
        sid = SprintId()
        s = Sprint(nombre=NotEmptyString("Sprint X"), id=sid)
        assert s.id == sid


class TestSprintWorkflow:
    def test_start(self) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint 1"))
        s.start()
        assert s.status == SprintStatus.ACTIVE
        assert s.fecha_inicio is not None

    def test_close(self) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint 1"))
        s.start()
        s.close()
        assert s.status == SprintStatus.CLOSED
        assert s.fecha_fin is not None

    def test_reopen(self) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint 1"))
        s.start()
        s.close()
        s.reopen()
        assert s.status == SprintStatus.PLANNED
        assert s.fecha_fin is None


class TestSprintWorkflowErrors:
    def test_start_active_sprint_raises_error(self) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint"))
        s.start()
        with pytest.raises(BusinessRuleError, match="active"):
            s.start()

    def test_start_closed_sprint_raises_error(self) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint"))
        s.start()
        s.close()
        with pytest.raises(BusinessRuleError, match="closed"):
            s.start()

    def test_close_planned_sprint_raises_error(self) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint"))
        with pytest.raises(BusinessRuleError, match="planned"):
            s.close()

    def test_close_closed_sprint_raises_error(self) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint"))
        s.start()
        s.close()
        with pytest.raises(BusinessRuleError, match="closed"):
            s.close()

    def test_reopen_planned_sprint_raises_error(self) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint"))
        with pytest.raises(BusinessRuleError, match="planned"):
            s.reopen()

    def test_reopen_active_sprint_raises_error(self) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint"))
        s.start()
        with pytest.raises(BusinessRuleError, match="active"):
            s.reopen()


class TestSprintBacklog:
    def test_add_historia(self, historia: HistoriaDeUsuario) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint 1"))
        s.start()
        s.add_historia(historia.id)
        assert historia.id in s.backlog

    def test_add_historia_to_closed_sprint_raises_error(
        self, historia: HistoriaDeUsuario
    ) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint"))
        s.start()
        s.close()
        with pytest.raises(BusinessRuleError, match="closed"):
            s.add_historia(historia.id)

    def test_add_duplicate_historia_raises_error(
        self, historia: HistoriaDeUsuario
    ) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint"))
        s.start()
        s.add_historia(historia.id)
        with pytest.raises(BusinessRuleError, match="already in sprint"):
            s.add_historia(historia.id)

    def test_remove_historia(self, historia: HistoriaDeUsuario) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint"))
        s.start()
        s.add_historia(historia.id)
        s.remove_historia(historia.id)
        assert historia.id not in s.backlog

    def test_remove_nonexistent_historia_raises_error(
        self, historia: HistoriaDeUsuario
    ) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint"))
        s.start()
        with pytest.raises(NotFoundError, match="HistoriaDeUsuario"):
            s.remove_historia(historia.id)


class TestSprintEquality:
    def test_equality_by_id(self) -> None:
        sid = SprintId()
        s1 = Sprint(nombre=NotEmptyString("A"), id=sid)
        s2 = Sprint(nombre=NotEmptyString("B"), id=sid)
        assert s1 == s2

    def test_inequality(self) -> None:
        s1 = Sprint(nombre=NotEmptyString("A"))
        s2 = Sprint(nombre=NotEmptyString("B"))
        assert s1 != s2

    def test_hash(self) -> None:
        sid = SprintId()
        s1 = Sprint(nombre=NotEmptyString("A"), id=sid)
        s2 = Sprint(nombre=NotEmptyString("B"), id=sid)
        assert hash(s1) == hash(s2)


class TestSprintStr:
    def test_str(self) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint 1"))
        assert str(s).startswith("Sprint(")

    def test_repr(self) -> None:
        s = Sprint(nombre=NotEmptyString("Sprint 1"))
        assert repr(s).startswith("Sprint(id=")
        assert "status=" in repr(s)


class TestProyectoCreation:
    def test_create_with_required_fields(self) -> None:
        p = Proyecto(nombre=NotEmptyString("My Project"))
        assert isinstance(p.id, ProyectoId)
        assert p.nombre == NotEmptyString("My Project")
        assert p.sprints == []
        assert p.historias == []

    def test_create_with_explicit_id(self) -> None:
        pid = ProyectoId()
        p = Proyecto(nombre=NotEmptyString("Project"), id=pid)
        assert p.id == pid


class TestProyectoHistorias:
    def test_add_historia(self, proyecto: Proyecto, historia: HistoriaDeUsuario) -> None:
        proyecto.add_historia(historia)
        assert historia in proyecto.historias

    def test_add_duplicate_historia_raises_error(
        self, proyecto: Proyecto, historia: HistoriaDeUsuario
    ) -> None:
        proyecto.add_historia(historia)
        with pytest.raises(BusinessRuleError, match="already exists"):
            proyecto.add_historia(historia)

    def test_get_historia(self, proyecto: Proyecto, historia: HistoriaDeUsuario) -> None:
        proyecto.add_historia(historia)
        assert proyecto.get_historia(historia.id) == historia

    def test_get_nonexistent_historia_raises_error(
        self, proyecto: Proyecto
    ) -> None:
        with pytest.raises(NotFoundError, match="HistoriaDeUsuario"):
            proyecto.get_historia(HistoriaDeUsuario(
                title=NotEmptyString("X"),
                story_points=StoryPoint(3),
            ).id)


class TestProyectoSprints:
    def test_create_sprint(self, proyecto: Proyecto) -> None:
        sprint = proyecto.create_sprint(nombre=NotEmptyString("Sprint 1"))
        assert isinstance(sprint, Sprint)
        assert sprint in proyecto.sprints

    def test_get_sprint(self, proyecto: Proyecto) -> None:
        sprint = proyecto.create_sprint(nombre=NotEmptyString("Sprint 1"))
        assert proyecto.get_sprint(sprint.id) == sprint

    def test_get_nonexistent_sprint_raises_error(self, proyecto: Proyecto) -> None:
        with pytest.raises(NotFoundError, match="Sprint"):
            proyecto.get_sprint(SprintId())

    def test_add_historia_to_sprint(
        self, proyecto: Proyecto, historia: HistoriaDeUsuario
    ) -> None:
        proyecto.add_historia(historia)
        sprint = proyecto.create_sprint(nombre=NotEmptyString("Sprint 1"))
        sprint.start()
        proyecto.add_historia_to_sprint(historia.id, sprint.id)
        assert historia.id in sprint.backlog

    def test_add_historia_to_nonexistent_sprint_raises_error(
        self, proyecto: Proyecto, historia: HistoriaDeUsuario
    ) -> None:
        proyecto.add_historia(historia)
        with pytest.raises(NotFoundError, match="Sprint"):
            proyecto.add_historia_to_sprint(historia.id, SprintId())

    def test_add_nonexistent_historia_to_sprint_raises_error(
        self, proyecto: Proyecto
    ) -> None:
        sprint = proyecto.create_sprint(nombre=NotEmptyString("Sprint 1"))
        sprint.start()
        fake_id = HistoriaDeUsuario(
            title=NotEmptyString("X"),
            story_points=StoryPoint(3),
        ).id
        with pytest.raises(NotFoundError, match="HistoriaDeUsuario"):
            proyecto.add_historia_to_sprint(fake_id, sprint.id)

    def test_reopen_sprint(self, proyecto: Proyecto) -> None:
        sprint = proyecto.create_sprint(nombre=NotEmptyString("Sprint 1"))
        sprint.start()
        sprint.close()
        proyecto.reopen_sprint(sprint.id)
        sprint_actualizado = proyecto.get_sprint(sprint.id)
        assert sprint_actualizado.status == SprintStatus.PLANNED
        assert sprint_actualizado.fecha_fin is None

    def test_reopen_nonexistent_sprint_raises_error(
        self, proyecto: Proyecto
    ) -> None:
        with pytest.raises(NotFoundError, match="Sprint"):
            proyecto.reopen_sprint(SprintId())


class TestProyectoExclusividadTemporal:
    def test_historia_not_in_two_active_sprints(
        self, proyecto: Proyecto, historia: HistoriaDeUsuario
    ) -> None:
        proyecto.add_historia(historia)
        sprint1 = proyecto.create_sprint(nombre=NotEmptyString("Sprint 1"))
        sprint1.start()
        proyecto.add_historia_to_sprint(historia.id, sprint1.id)

        sprint2 = proyecto.create_sprint(nombre=NotEmptyString("Sprint 2"))
        sprint2.start()
        with pytest.raises(BusinessRuleError, match="already in active sprint"):
            proyecto.add_historia_to_sprint(historia.id, sprint2.id)

    def test_historia_can_be_in_planned_and_active_sprint(
        self, proyecto: Proyecto, historia: HistoriaDeUsuario
    ) -> None:
        proyecto.add_historia(historia)
        sprint1 = proyecto.create_sprint(nombre=NotEmptyString("Sprint 1"))
        sprint1.start()
        proyecto.add_historia_to_sprint(historia.id, sprint1.id)

        sprint2 = proyecto.create_sprint(nombre=NotEmptyString("Sprint 2"))
        proyecto.add_historia_to_sprint(historia.id, sprint2.id)
        assert historia.id in sprint2.backlog

    def test_historia_can_be_in_closed_and_new_active_sprint(
        self, proyecto: Proyecto, historia: HistoriaDeUsuario
    ) -> None:
        proyecto.add_historia(historia)
        sprint1 = proyecto.create_sprint(nombre=NotEmptyString("Sprint 1"))
        sprint1.start()
        proyecto.add_historia_to_sprint(historia.id, sprint1.id)
        sprint1.close()

        sprint2 = proyecto.create_sprint(nombre=NotEmptyString("Sprint 2"))
        sprint2.start()
        proyecto.add_historia_to_sprint(historia.id, sprint2.id)
        assert historia.id in sprint2.backlog


class TestProyectoEquality:
    def test_equality_by_id(self) -> None:
        pid = ProyectoId()
        p1 = Proyecto(nombre=NotEmptyString("A"), id=pid)
        p2 = Proyecto(nombre=NotEmptyString("B"), id=pid)
        assert p1 == p2

    def test_inequality(self) -> None:
        p1 = Proyecto(nombre=NotEmptyString("A"))
        p2 = Proyecto(nombre=NotEmptyString("B"))
        assert p1 != p2

    def test_hash(self) -> None:
        pid = ProyectoId()
        p1 = Proyecto(nombre=NotEmptyString("A"), id=pid)
        p2 = Proyecto(nombre=NotEmptyString("B"), id=pid)
        assert hash(p1) == hash(p2)


class TestProyectoStr:
    def test_str(self) -> None:
        p = Proyecto(nombre=NotEmptyString("My Project"))
        assert str(p).startswith("Proyecto(")

    def test_repr(self) -> None:
        p = Proyecto(nombre=NotEmptyString("My Project"))
        assert repr(p).startswith("Proyecto(id=")
        assert "nombre=" in repr(p)
