import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"

def verify_agent_flow():
    print("Verifying Agent Flow...")
    print("=" * 50)

    # 1. Login as Admin
    print("\n1. Logging in as Admin...")
    admin_login = {
        "username": "admin@toursaas.com",
        "password": "admin123"
    }
    try:
        response = requests.post(f"{BASE_URL}/auth/login", data=admin_login)
        if response.status_code != 200:
            print(f"FAILED: Admin login failed. {response.status_code} {response.text}")
            return
        admin_token = response.json()["access_token"]
        print("SUCCESS! Admin logged in.")
    except Exception as e:
        print(f"FAILED: Connection error: {e}")
        return

    # 2. Create Agent
    print("\n2. Creating Agent...")
    import uuid
    agent_email = f"agent_{uuid.uuid4()}@example.com"
    agent_data = {
        "email": agent_email,
        "password": "agentpassword",
        "first_name": "Test",
        "last_name": "Agent",
        "phone": "1234567890"
    }
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.post(f"{BASE_URL}/admin/agents", json=agent_data, headers=headers)
    
    if response.status_code in [200, 201]:
        print("SUCCESS! Agent created.")
        agent_id = response.json()["id"]
    elif response.status_code == 409:
        print("Agent already exists (using existing).")
    else:
        print(f"FAILED: Could not create agent. {response.status_code} {response.text}")
        return

    # 3. Login as Agent
    print("\n3. Logging in as Agent...")
    agent_login = {
        "username": agent_email,
        "password": "agentpassword"
    }
    response = requests.post(f"{BASE_URL}/auth/login", data=agent_login)
    if response.status_code != 200:
        print(f"FAILED: Agent login failed. {response.status_code} {response.text}")
        return
    agent_token = response.json()["access_token"]
    print("SUCCESS! Agent logged in.")

    # 4. Create Package as Agent
    print("\n4. Creating Package as Agent...")
    package_data = {
        "title": "Agent Exclusive Tour",
        "destination": "Paris",
        "duration_days": 5,
        "duration_nights": 4,
        "price_per_person": 1500,
        "max_group_size": 15,
        "category": "Luxury",
        "description": "Exclusive tour created by agent"
    }
    agent_headers = {"Authorization": f"Bearer {agent_token}"}
    response = requests.post(f"{BASE_URL}/agent/packages", json=package_data, headers=agent_headers)
    
    if response.status_code == 200:
        pkg = response.json()
        print(f"SUCCESS! Package created: {pkg['title']} (ID: {pkg['id']})")
        package_id = pkg["id"]
    else:
        print(f"FAILED: Could not create package. {response.status_code} {response.text}")
        return

    # 5. List Packages as Agent
    print("\n5. Listing Packages as Agent...")
    response = requests.get(f"{BASE_URL}/agent/packages", headers=agent_headers)
    if response.status_code == 200:
        packages = response.json()
        print(f"SUCCESS! Found {len(packages)} packages.")
        found = any(p["id"] == package_id for p in packages)
        if found:
            print("SUCCESS! Created package found in list.")
        else:
            print("FAILED: Created package NOT found in list.")
    else:
        print(f"FAILED: Could not list packages. {response.status_code} {response.text}")

if __name__ == "__main__":
    verify_agent_flow()
