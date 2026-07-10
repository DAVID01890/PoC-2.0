from __future__ import annotations

import logging
import time

from litestar.middleware import MiddlewareProtocol
from litestar.types import ASGIApp, Message, Receive, Scope, Send

logger = logging.getLogger("proyecto.api")


class RequestLoggingMiddleware(MiddlewareProtocol):
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.monotonic()
        method = scope["method"]
        path = scope.get("path", "")
        logger.info("--> %s %s", method, path)

        async def _send(message: Message) -> None:
            if message["type"] == "http.response.start":
                elapsed = int((time.monotonic() - start) * 1000)
                logger.info(
                    "<-- %s %s %s (%dms)",
                    method,
                    path,
                    message.get("status", 0),
                    elapsed,
                )
            await send(message)

        await self.app(scope, receive, _send)


class SecurityHeadersMiddleware(MiddlewareProtocol):
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def _send(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = message.get("headers", [])
                extra = [
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"x-xss-protection", b"1; mode=block"),
                    (b"referrer-policy", b"strict-origin-when-cross-origin"),
                ]
                message["headers"] = list(headers) + extra
            await send(message)

        await self.app(scope, receive, _send)
