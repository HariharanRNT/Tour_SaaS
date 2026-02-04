import asyncio
import requests
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User

async def inspect_admin():
    print("Inspecting Admin User in DB...")
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "admin@toursaas.com"))
        user = result.scalar_one_or_none()
        if user:
            print(f"User Found: {user.email}")
            print(f"Role in DB: {user.role} (Type: {type(user.role)})")
            print(f"Is Active: {user.is_active}")
        else:
            print("User admin@toursaas.com NOT FOUND in DB")

def test_login_response():
    print("\nTesting Login API Response...")
    url = "http://localhost:8000/api/v1/auth/login"
    data = {"username": "admin@toursaas.com", "password": "admin123"}
    try:
        response = requests.post(url, data=data)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            json_resp = response.json()
            print("Full JSON Response:")
            print(json_resp)
            user_role = json_resp.get("user", {}).get("role")
            print(f"User Role in JSON: '{user_role}'")
        else:
            print(f"Login Failed: {response.text}")
    except Exception as e:
        print(f"Error calling API: {e}")

if __name__ == "__main__":
    asyncio.run(inspect_admin())
    test_login_response()
