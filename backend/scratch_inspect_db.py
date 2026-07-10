import sqlite3
import os

db_path = os.getenv("SQLITE_PATH", "local.db")
print(f"Connecting to database: {db_path}")
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

try:
    print("--- Proyectos ---")
    for row in cursor.execute("SELECT * FROM proyectos"):
        print(dict(row))
        
    print("\n--- Historias de Usuario ---")
    for row in cursor.execute("SELECT * FROM historias"):
        print(dict(row))
        
    print("\n--- Tareas Técnicas ---")
    for row in cursor.execute("SELECT * FROM tareas_tecnicas"):
        print(dict(row))
except Exception as e:
    print("Error:", e)
finally:
    conn.close()
