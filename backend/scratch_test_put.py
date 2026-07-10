import requests

url = "http://127.0.0.1:8000/api/v1/proyectos/33ff72a9-75a2-4ccf-bc2f-e17ae96065b5/historias/c44cf472-3a65-463b-8fd6-699f7c505cb0/status"
# We might need authentication. Let's register/login to get a token.
session = requests.Session()
session.post("http://127.0.0.1:8000/api/v1/auth/register", json={"name": "Test", "email": "test@example.com", "password": "secret123"})
resp = session.post("http://127.0.0.1:8000/api/v1/auth/login", json={"email": "test@example.com", "password": "secret123"})
if resp.status_code == 200:
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
else:
    headers = {}

# Make the PUT status request
response = session.put(url, json={"status": "completed"}, headers=headers)
print("Status Code:", response.status_code)
print("Response Text:", response.text)
