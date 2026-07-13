import asyncio
from dotenv import load_dotenv

# Cargar el archivo .env de la raíz del proyecto para obtener las credenciales de Turso
load_dotenv("../.env")

from src.db.connection import get_turso_client

async def test():
    print("Conectando a Turso mediante get_turso_client...")
    try:
        async with get_turso_client() as client:
            # Obtener esquemas de tablas para validar la conexión y estructura
            rs = await client.execute("SELECT name FROM sqlite_master WHERE type='table'")
            print("\nTablas encontradas en la base de datos Turso:")
            for row in rs.rows:
                print(f" - {row[0]}")
            print("\nConexión exitosa y estructura de datos validada.")
    except Exception as e:
        print(f"Error al conectar con Turso: {e}")

if __name__ == "__main__":
    asyncio.run(test())
