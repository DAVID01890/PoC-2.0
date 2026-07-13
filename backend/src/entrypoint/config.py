from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    sqlite_path: str = "local.db"
    turso_url: str = ""
    turso_token: str = ""
    outbox_webhook_url: str = ""
    skip_db_init: bool = False
    debug: bool = False
    auth_provider: str = "internal"
    jwt_secret: str = ""
    api_title: str = "Scrum Management API"
    api_version: str = "1.0.0"
    cors_origins: str = "*"

    gemini_api_key: str = ""

    default_admin_email: str = "admin@luma.com"
    default_admin_name: str = "Admin"
    default_admin_password: str = "123456"

    @classmethod
    def from_env(cls, env_file: str | None = None) -> Settings:
        if env_file:
            load_dotenv(env_file, override=True)
        jwt_secret = os.getenv("JWT_SECRET", "")
        if not jwt_secret:
            raise RuntimeError(
                "La variable de entorno JWT_SECRET es obligatoria y no está definida. "
                "Genera un secreto seguro con: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return cls(
            sqlite_path=os.getenv("SQLITE_PATH", "local.db"),
            turso_url=os.getenv("TURSO_DATABASE_URL", ""),
            turso_token=os.getenv("TURSO_AUTH_TOKEN", ""),
            outbox_webhook_url=os.getenv("OUTBOX_WEBHOOK_URL", ""),
            skip_db_init=os.getenv("SKIP_DB_INIT") == "1",
            debug=os.getenv("DEBUG") == "1",
            auth_provider=os.getenv("AUTH_PROVIDER", "internal"),
            jwt_secret=jwt_secret,
            api_title=os.getenv("API_TITLE", "Scrum Management API"),
            api_version=os.getenv("API_VERSION", "1.0.0"),
            cors_origins=os.getenv("CORS_ORIGINS", "*"),
            gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
            default_admin_email=os.getenv("DEFAULT_ADMIN_EMAIL", "admin@luma.com"),
            default_admin_name=os.getenv("DEFAULT_ADMIN_NAME", "Admin"),
            default_admin_password=os.getenv("DEFAULT_ADMIN_PASSWORD", "123456"),
        )


    @property
    def is_turso_enabled(self) -> bool:
        return bool(self.turso_url and self.turso_token)

    @property
    def cors_origin_list(self) -> list[str]:
        origins = self.cors_origins
        if origins == "*":
            return ["*"]
        return [o.strip() for o in origins.split(",") if o.strip()]
