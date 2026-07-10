from dataclasses import dataclass, field

@dataclass
class ChatMessage:
    sender: str
    text: str

@dataclass
class ChatRequest:
    message: str
    project_id: str | None = None
    history: list[ChatMessage] = field(default_factory=list)

@dataclass
class ChatResponse:
    response: str
    action_type: str = "none"
