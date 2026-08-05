import sys
import os
import asyncio
sys.path.append(os.path.abspath('d:/Hariharan/G-Project/RNT_Tour/backend'))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test():
    # Login
    response = client.post("/api/v1/auth/login", data={"username": "agent@example.com", "password": "password123"})
    token = response.json().get("access_token")
    if not token:
        print("Login failed")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    r = client.get("/api/v1/agent/packages/22d0c4c7-c57f-47ce-a93d-575bc6adda1d", headers=headers)
    print("Status:", r.status_code)
    data = r.json()
    print("cancellation_enabled:", data.get("cancellation_enabled"))
    print("advance_cancellation_enabled:", data.get("advance_cancellation_enabled"))

if __name__ == "__main__":
    test()
