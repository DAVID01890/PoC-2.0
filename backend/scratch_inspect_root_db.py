import sqlite3
import os

db_path = "../local.db"
print(f"Connecting to database: {db_path}")
if not os.path.exists(db_path):
    print("Database file does not exist at this path.")
    exit()

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
except Exception as e:
    print("Error:", e)
finally:
    conn.close()
