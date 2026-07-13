import asyncio
import sys
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv("../.env")

from src.entrypoint.config import Settings
from src.db.connection import get_turso_client, get_sqlite_connection, init_db

async def clean_database():
    settings = Settings.from_env()
    print("====================================================")
    print("ADVERTENCIA: Este script ELIMINARÁ todos los datos de la base de datos.")
    print(f"Base de datos de destino:")
    if settings.is_turso_enabled:
        print(f" -> TURSO (Nube): {settings.turso_url}")
    else:
        print(f" -> SQLITE (Local): {settings.sqlite_path}")
    print("====================================================")
    
    # En scripts interactivos podríamos pedir confirmación, aquí procedemos con precaución
    print("\n[+] Vaciando tablas...")
    
    tablas = [
        "tareas_tecnicas",
        "historias",
        "sprints",
        "proyecto_miembros",
        "proyectos",
        "usuarios",
        "outbox_events",
        "proyecto_read_model"
    ]
    
    try:
        if settings.is_turso_enabled:
            async with get_turso_client(settings) as client:
                for tabla in tablas:
                    print(f" - Eliminando datos de '{tabla}'...")
                    await client.execute(f"DELETE FROM {tabla}")
        else:
            async with get_sqlite_connection(settings) as conn:
                for tabla in tablas:
                    print(f" - Eliminando datos de '{tabla}'...")
                    await conn.execute(f"DELETE FROM {tabla}")
                await conn.commit()
                
        print("\n[+] Base de datos vaciada con éxito.")
        print("[+] Re-inicializando base de datos y creando administrador por defecto...")
        
        # Volver a inicializar y semillar el admin
        await init_db(settings)
        
        print("\n[+] Proceso completado exitosamente.")
        print(f" -> Administrador Creado: {settings.default_admin_email}")
        print(f" -> Nombre: {settings.default_admin_name}")
        print(f" -> Contraseña: (La configurada en tu DEFAULT_ADMIN_PASSWORD)")
        
    except Exception as e:
        print(f"\n[!] Error durante la limpieza: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(clean_database())
