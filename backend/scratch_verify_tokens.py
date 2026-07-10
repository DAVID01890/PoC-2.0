import asyncio
import os
from dotenv import load_dotenv

load_dotenv("../.env")

from src.entrypoint.config import Settings
from src.db.connection import get_turso_client

async def main():
    settings = Settings.from_env("../.env")
    print("Connecting to Turso:", settings.turso_url)
    async with get_turso_client(settings) as client:
        rs = await client.execute("SELECT COUNT(*) as cnt FROM historias")
        count = rs.rows[0][0]
        rs2 = await client.execute("SELECT COUNT(*) as cnt FROM proyectos")
        proj_count = rs2.rows[0][0]
        print(f"Turso connection OK")
        print(f"  Proyectos: {proj_count}")
        print(f"  Historias: {count}")

asyncio.run(main())
