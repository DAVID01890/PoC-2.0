import asyncio
import os
import sqlite3
from src.entrypoint.config import Settings
from src.db.connection import is_turso_enabled, get_sqlite_connection, get_turso_client

async def main():
    settings = Settings.from_env(env_file="../.env")
    print("Is Turso enabled?", is_turso_enabled(settings))
    
    if is_turso_enabled(settings):
        print(f"Connecting to Turso: {settings.turso_url}")
        async with get_turso_client(settings) as client:
            # Let's query projects
            rs_proj = await client.execute("SELECT id, nombre FROM proyectos")
            for p_row in rs_proj.rows:
                p_id, p_name = p_row[0], p_row[1]
                print(f"Project: {p_name} (ID: {p_id})")
                
                # Query stories for this project
                rs_stories = await client.execute("SELECT id, titulo, status FROM historias WHERE proyecto_id = ?", [p_id])
                print(f"  Stories ({len(rs_stories.rows)}):")
                for idx, s_row in enumerate(rs_stories.rows):
                    s_id, s_title, s_status = s_row[0], s_row[1], s_row[2]
                    print(f"    HU-{idx+1}: {s_title} (ID: {s_id}) - {s_status}")
                    
                    if idx == 3: # HU-4
                        print(f"      --> Updating HU-4 to 'done'...")
                        await client.execute("UPDATE historias SET status = 'done' WHERE id = ?", [s_id])
                        print("      --> Update complete!")
    else:
        db_path = settings.sqlite_path
        print(f"Connecting to SQLite: {db_path}")
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id, nombre FROM proyectos")
            projects = cursor.fetchall()
            for p in projects:
                print(f"Project: {p['nombre']} (ID: {p['id']})")
                cursor.execute("SELECT id, titulo, status FROM historias WHERE proyecto_id = ? ORDER BY rowid", (p['id'],))
                stories = cursor.fetchall()
                print(f"  Stories ({len(stories)}):")
                for idx, s in enumerate(stories):
                    print(f"    HU-{idx+1}: {s['titulo']} (ID: {s['id']}) - {s['status']}")
                    if idx == 3: # HU-4
                        print(f"      --> Updating HU-4 to 'done'...")
                        cursor.execute("UPDATE historias SET status = 'done' WHERE id = ?", (s['id'],))
                        conn.commit()
                        print("      --> Update complete!")
        except Exception as e:
            print("SQLite Error:", e)
        finally:
            conn.close()

if __name__ == "__main__":
    asyncio.run(main())
