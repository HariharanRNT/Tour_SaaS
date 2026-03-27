import asyncio
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.models import UserRole

def test_duplicate_agent_registration():
    client = TestClient(app)
    
    # Existing user email (from my previous inspection, hariharan@reshandthosh.com exists)
    email = "hariharan@reshandthosh.com"
    
    print(f"Testing duplicate registration for {email}...")
    
    # 1. Test /api/v1/auth/register/agent
    payload = {
        "agency_name": "Test Agency",
        "company_legal_name": "Test Co",
        "domain": "test.com",
        "business_address": "123 Street",
        "country": "India",
        "state": "TN",
        "city": "Chennai",
        "first_name": "Test",
        "last_name": "User",
        "email": email,
        "phone": "9876543210",
        "password": "password123",
        "confirm_password": "password123"
    }
    
    response = client.post("/api/v1/auth/register/agent", json=payload)
    print(f"Auth Register Status: {response.status_code}")
    print(f"Auth Register Body: {response.text}")
    
    # 2. Test /api/v1/admin/agents (requires admin auth)
    from app.api.deps import get_current_admin
    from app.models import User
    mock_admin = User(email="admin@example.com", role=UserRole.ADMIN)
    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    
    admin_payload = {
        "email": email,
        "first_name": "Admin",
        "last_name": "Test",
        "password": "password123",
        "agency_name": "Admin Agency",
        "country": "India"
        # Others optional
    }
    
    response = client.post("/api/v1/admin/agents", json=admin_payload)
    print(f"Admin Create Status: {response.status_code}")
    print(f"Admin Create Body: {response.text}")
    
    app.dependency_overrides = {}

if __name__ == "__main__":
    test_duplicate_agent_registration()
