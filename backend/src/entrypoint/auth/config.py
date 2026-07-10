from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass(frozen=True)
class AuthSettings:
    secret: str = ""
    algorithm: str = "HS256"
    expiration_days: int = 7

    @classmethod
    def from_env(cls, env_file: str | None = None) -> AuthSettings:
        if env_file:
            load_dotenv(env_file)
        secret = os.getenv("JWT_SECRET", "")
        if not secret:
            raise RuntimeError(
                "La variable de entorno JWT_SECRET es obligatoria y no está definida. "
                "Genera un secreto seguro con: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return cls(
            secret=secret,
            algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        )
