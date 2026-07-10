import sqlite3
import os

db_path = os.getenv("SQLITE_PATH", "local.db")
print(f"Connecting to database: {db_path}")
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

try:
    # Let's find the active projects and their stories
    cursor.execute("SELECT id, nombre FROM proyectos")
    projects = cursor.fetchall()
    print("Projects found:")
    for p in projects:
        print(f"Project: {p['nombre']} (ID: {p['id']})")
        # Get stories for this project
        cursor.execute("SELECT id, titulo, status FROM historias WHERE proyecto_id = ?", (p['id'],))
        stories = cursor.fetchall()
        for idx, s in enumerate(stories):
            print(f"  HU-{idx+1}: {s['titulo']} (ID: {s['id']}), Status: {s['status']}")
            if idx == 3: # HU-4 (index 3)
                print(f"    --> Updating HU-4 status to 'done' (completed)...")
                conn.execute("UPDATE historias SET status = 'done' WHERE id = ?", (s['id'],))
                conn.commit()
                print(f"    --> HU-4 updated successfully!")

except Exception as e:
    print("Error:", e)
finally:
    conn.close()
