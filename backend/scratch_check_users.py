import asyncio
from dotenv import load_dotenv

load_dotenv("../.env")

from src.db.connection import get_turso_client

async def check_users():
    async with get_turso_client() as client:
        # Usamos los nombres correctos de columna del esquema de la base de datos: name, role, avatar
        rs = await client.execute("SELECT id, email, name, role, avatar FROM usuarios")
        print("\n=== USUARIOS REGISTRADOS EN TURSO ===")
        if not rs.rows:
            print("No hay usuarios registrados en la base de datos de Turso.")
        else:
            for row in rs.rows:
                print(f"ID: {row[0]}")
                print(f"  Email: {row[1]}")
                print(f"  Nombre: {row[2]}")
                print(f"  Rol: {row[3]}")
                print(f"  Avatar: {row[4] or 'Ninguno'}")
                print("-" * 40)
        
        # Check active projects count as well
        p_rs = await client.execute("SELECT COUNT(*) FROM proyectos")
        print(f"Total Proyectos en Base de Datos: {p_rs.rows[0][0]}\n")

if __name__ == "__main__":
    asyncio.run(check_users())
