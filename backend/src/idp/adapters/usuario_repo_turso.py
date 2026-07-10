from __future__ import annotations

from uuid import UUID

from libsql_client import create_client

from src.entrypoint.config import Settings
from src.idp.domain.entities import Usuario
from src.idp.domain.value_objects import UserId, UserRole
from src.idp.ports.usuario_repository import UsuarioRepository
from src.shared_kernel.domain.base_value_objects import Email, NotEmptyString


def _normalize_url(url: str) -> str:
    return url.replace("libsql://", "https://", 1)


class UsuarioRepositorioTurso(UsuarioRepository):
    def __init__(self, settings: Settings | None = None) -> None:
        s = settings if settings is not None else Settings.from_env()
        if not s.is_turso_enabled:
            raise RuntimeError(
                "Turso is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN."
            )
        self._url = _normalize_url(s.turso_url)
        self._token = s.turso_token

    async def save(self, usuario: Usuario) -> None:
        client = create_client(url=self._url, auth_token=self._token)
        try:
            await client.execute(
                "INSERT OR REPLACE INTO usuarios (id, email, name, role, is_active, password_hash, avatar) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    str(usuario.id),
                    str(usuario.email),
                    str(usuario.name),
                    usuario.role.value,
                    1 if usuario.is_active else 0,
                    usuario.password_hash,
                    usuario.avatar,
                ),
            )
        finally:
            await client.close()

    async def find_by_id(self, user_id: UserId) -> Usuario | None:
        client = create_client(url=self._url, auth_token=self._token)
        try:
            result = await client.execute(
                "SELECT id, email, name, role, is_active, password_hash, avatar "
                "FROM usuarios WHERE id = ?",
                (str(user_id),),
            )
            if not result.rows:
                return None
            row = result.rows[0]
            return self._row_to_usuario(row)
        finally:
            await client.close()

    async def find_by_email(self, email: Email) -> Usuario | None:
        client = create_client(url=self._url, auth_token=self._token)
        try:
            result = await client.execute(
                "SELECT id, email, name, role, is_active, password_hash, avatar "
                "FROM usuarios WHERE email = ?",
                (str(email),),
            )
            if not result.rows:
                return None
            row = result.rows[0]
            return self._row_to_usuario(row)
        finally:
            await client.close()

    async def list(self) -> list[Usuario]:
        client = create_client(url=self._url, auth_token=self._token)
        try:
            result = await client.execute(
                "SELECT id, email, name, role, is_active, password_hash, avatar "
                "FROM usuarios ORDER BY email"
            )
            return [self._row_to_usuario(row) for row in result.rows]
        finally:
            await client.close()

    async def delete(self, user_id: UserId) -> None:
        client = create_client(url=self._url, auth_token=self._token)
        try:
            await client.execute(
                "DELETE FROM usuarios WHERE id = ?",
                (str(user_id),),
            )
        finally:
            await client.close()

    @staticmethod
    def _row_to_usuario(row) -> Usuario:
        try:
            avatar = row["avatar"]
        except (KeyError, IndexError):
            avatar = None
        return Usuario(
            id=UserId(UUID(row["id"])),
            email=Email(row["email"]),
            name=NotEmptyString(row["name"]),
            role=UserRole(row["role"]),
            is_active=bool(row["is_active"]),
            password_hash=row["password_hash"],
            avatar=avatar,
        )
