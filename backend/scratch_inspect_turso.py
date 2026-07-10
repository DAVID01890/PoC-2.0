import asyncio
import os
import libsql_client
from src.entrypoint.config import Settings

async def test():
    settings = Settings.from_env()
    url = os.getenv("TURSO_DATABASE_URL", settings.turso_url)
    token = os.getenv("TURSO_AUTH_TOKEN", settings.turso_token)
    
    if not url:
        print("Turso URL not configured")
        return
        
    print(f"Connecting to Turso: {url}")
    async with libsql_client.create_client_async(url=url, auth_token=token) as client:
        # Get schemas
        rs = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name IN ('historias', 'tareas_tecnicas')")
        for row in rs.rows:
            print(row[0])
            print("-" * 50)

asyncio.run(test())
