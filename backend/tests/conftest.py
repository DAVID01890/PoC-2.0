import os
from pathlib import Path
import pytest
from dotenv import load_dotenv

# Cargar .env del proyecto si existe (desarrollo local)
load_dotenv(Path(__file__).parents[2] / ".env")

# Fallback seguro para entornos de CI donde no existe .env
if not os.getenv("JWT_SECRET"):
    os.environ["JWT_SECRET"] = "test-secret-only-for-ci-do-not-use-in-production-32b"


import pytest_asyncio

@pytest_asyncio.fixture(autouse=True)
async def reset_database_pool():
    from src.db.pool import close_pool
    await close_pool()
    yield
    await close_pool()


