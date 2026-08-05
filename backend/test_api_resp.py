import requests
import json

response = requests.post("http://localhost:8000/api/v1/auth/login", data={"username": "agent@example.com", "password": "password123"})
token = response.json().get("access_token")

if token:
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get("http://localhost:8000/api/v1/agent/packages/22d0c4c7-c57f-47ce-a93d-575bc6adda1d", headers=headers)
    data = r.json()
    print("cancellation_enabled:", data.get("cancellation_enabled"))
    print("advance_cancellation_enabled:", data.get("advance_cancellation_enabled"))
else:
    print("No token")
