import os

def find_dbs():
    for root, dirs, files in os.walk("c:\\Users\\vlope\\Desktop\\PoC 2.0"):
        # skip virtual envs or node_modules
        if "node_modules" in root or ".venv" in root or "venv" in root or ".git" in root:
            continue
        for file in files:
            if file.endswith(".db"):
                full_path = os.path.join(root, file)
                print(f"Found DB: {full_path} (Size: {os.path.getsize(full_path)} bytes)")

if __name__ == "__main__":
    find_dbs()
