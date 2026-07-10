from litestar import Router
from src.entrypoint.ai.handlers import AIChatController

ai_router = Router(
    path="/ai",
    route_handlers=[AIChatController],
)
