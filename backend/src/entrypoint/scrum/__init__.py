from litestar import Router

from src.entrypoint.scrum.proyecto_controller import ProyectoController
from src.entrypoint.scrum.sprint_controller import SprintController
from src.entrypoint.scrum.historia_controller import HistoriaController
from src.entrypoint.scrum.tarea_controller import TareaController
from src.entrypoint.scrum.miembro_controller import MiembroController

scrum_router = Router(
    path="/",
    route_handlers=[
        ProyectoController,
        SprintController,
        HistoriaController,
        TareaController,
        MiembroController,
    ],
)
