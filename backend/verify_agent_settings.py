import requests
import sys
import uuid
import json

BASE_URL = "http://localhost:8000/api/v1"

def verify_settings():
    print("Verifying Agent Settings APIs...")
    print("=" * 50)

    # 1. Login as Admin to create test user
    print("\n1. Logging in as Admin...")
    admin_login = {"username": "admin@globaltours.com", "password": "adminpassword123"}
    try:
        response = requests.post(f"{BASE_URL}/auth/login", data=admin_login)
        if response.status_code != 200:
            print(f"FAILED: Admin login. {response.text}")
            return
        admin_token = response.json()["access_token"]
        print("SUCCESS! Admin token acquired.")
    except Exception as e:
        print(f"FAILED: {e}")
        return

    # 2. Create Test Agent
    print("\n2. Creating Test Agent...")
    agent_email = f"agent_settings_{uuid.uuid4().hex[:8]}@test.com"
    pwd = "TestUser123!"
    agent_data = {
        "email": agent_email,
        "password": pwd,
        "first_name": "Settings",
        "last_name": "Tester",
        "phone": "9876543210"
    }
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = requests.post(f"{BASE_URL}/admin/agents", json=agent_data, headers=headers)
    if res.status_code not in [200, 201]:
        # Try login if exists?
        print(f"Agent creation failed: {res.status_code} {res.text}")
    else:
        print(f"SUCCESS! Agent created: {agent_email}")

    # 3. Login as Agent
    print("\n3. Logging in as Agent...")
    agent_login = {"username": agent_email, "password": pwd}
    res = requests.post(f"{BASE_URL}/auth/login", data=agent_login)
    if res.status_code != 200:
        print(f"FAILED: Agent login. {res.text}")
        return
    agent_token = res.json()["access_token"]
    agent_headers = {"Authorization": f"Bearer {agent_token}"}
    print("SUCCESS! Agent logged in.")

    # 4. Get Initial Settings
    print("\n4. Get Initial Settings...")
    res = requests.get(f"{BASE_URL}/agent/settings", headers=agent_headers)
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        data = res.json()
        print(f"Currency: {data.get('currency')}")
        print(f"SMTP: {data.get('smtp')}")
        print(f"Razorpay: {data.get('razorpay')}")
    else:
        print(f"FAILED: {res.text}")
        return

    # 5. Update SMTP Settings
    print("\n5. Updating SMTP Settings...")
    smtp_payload = {
        "host": "smtp.mailtrap.io",
        "port": 2525,
        "username": "testuser",
        "password": "secretpassword",
        "from_email": "noreply@agent.com",
        "from_name": "Agent Travel",
        "encryption_type": "starttls"
    }
    res = requests.put(f"{BASE_URL}/agent/settings/smtp", json=smtp_payload, headers=agent_headers)
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        data = res.json()
        print(f"Updated Host: {data.get('host')}")
        # Verify password is NOT returned or is masked? 
        # My implementation returns the object as Pydantic model response.
        # Check schemas. Make sure password is not returned or handled.
        # Actually my implementation returns the ORM object, and Pydantic filters it.
        # Response model has password: Optional[str] = None? No, Response model doesn't have password.
        # Check AgentSMTPSettingsResponse in schemas.py if I modified it? 
        # I didn't modify schemas.py to remove it, but I should have checked.
        # Let's see what we get.
        if "password" in data and data["password"]:
             print(f"WARNING: Password returned in response! {data['password']}")
        else:
             print("SUCCESS: Password not returned/masked.")
    else:
        print(f"FAILED: {res.text}")

    # 6. Update Razorpay Settings
    print("\n6. Updating Razorpay Settings...")
    rp_payload = {
        "key_id": "rzp_test_12345678",
        "key_secret": "razorpaysecret"
    }
    res = requests.put(f"{BASE_URL}/agent/settings/razorpay", json=rp_payload, headers=agent_headers)
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        data = res.json()
        print(f"Updated Key ID: {data.get('key_id')}")
        if "key_secret" in data and data["key_secret"]:
             print(f"WARNING: Secret returned! {data['key_secret']}")
        else:
             print("SUCCESS: Secret masked/not returned.")
    else:
        print(f"FAILED: {res.text}")

    # 7. Check Settings Again
    print("\n7. Verifying Persistence...")
    res = requests.get(f"{BASE_URL}/agent/settings", headers=agent_headers)
    if res.status_code == 200:
        data = res.json()
        print(f"SMTP Host: {data.get('smtp', {}).get('host')}")
        print(f"Razorpay Key: {data.get('razorpay', {}).get('key_id')}")
        
        if data.get('smtp', {}).get('host') == "smtp.mailtrap.io" and \
           data.get('razorpay', {}).get('key_id') == "rzp_test_12345678":
            print("SUCCESS! Settings persisted.")
        else:
            print("FAILED: Settings mismatch.")
    

    # 8. Test SMTP Connection (Expected Failure with fake creds)
    print("\n8. Testing SMTP Connection (expect failure)...")
    # For test endpoint, we pass the credentials explicitly? 
    # Or does it use saved?
    # My implementation accepts `AgentSMTPSettingsCreate` as body. 
    # So frontend sends the form data.
    res = requests.post(f"{BASE_URL}/agent/settings/smtp/test", json=smtp_payload, headers=agent_headers)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
    if res.status_code == 400:
        print("SUCCESS! Got 400 as expected for fake credentials.")
    elif res.status_code == 200:
        print("WARNING: It succeeded? Maybe fake credentials actually worked or mock?")
    else:
        print(f"Unexpected status: {res.status_code}")

if __name__ == "__main__":
    verify_settings()
