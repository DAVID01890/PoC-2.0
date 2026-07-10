from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any


class DatabaseStrategy(ABC):
    @abstractmethod
    async def execute(self, sql: str, params: tuple = ()) -> Any:
        """Ejecuta una consulta SQL simple y retorna las filas o None."""
        ...

    @abstractmethod
    async def fetchall(self, sql: str, params: tuple = ()) -> list[Any]:
        """Ejecuta una consulta SQL de lectura y retorna todas las filas."""
        ...

    @abstractmethod
    async def commit(self) -> None:
        """Confirma los cambios."""
        ...


class SQLiteStrategy(DatabaseStrategy):
    def __init__(self, pool) -> None:
        self._pool = pool

    def _conn(self):
        return self._pool.connection()

    async def execute(self, sql: str, params: tuple = ()) -> Any:
        async with self._conn() as conn:
            cursor = await conn.execute(sql, params)
            await conn.commit()
            return cursor

    async def fetchall(self, sql: str, params: tuple = ()) -> list[Any]:
        async with self._conn() as conn:
            cursor = await conn.execute(sql, params)
            return await cursor.fetchall()

    async def commit(self) -> None:
        pass


class TursoStrategy(DatabaseStrategy):
    def __init__(self, url: str, token: str) -> None:
        self._url = url.replace("libsql://", "https://", 1)
        self._token = token

    async def execute(self, sql: str, params: tuple = ()) -> Any:
        from libsql_client import create_client
        client = create_client(url=self._url, auth_token=self._token)
        try:
            return await client.execute(sql, params)
        finally:
            await client.close()

    async def fetchall(self, sql: str, params: tuple = ()) -> list[Any]:
        from libsql_client import create_client
        client = create_client(url=self._url, auth_token=self._token)
        try:
            result = await client.execute(sql, params)
            return result.rows
        finally:
            await client.close()

    async def commit(self) -> None:
        pass
