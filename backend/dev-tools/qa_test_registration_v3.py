import requests
import json
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_agent_registration(payload, test_name, override_email=True):
    print(f"\n--- Testing: {test_name} ---")
    
    if override_email:
        unique_id = str(uuid.uuid4())[:8]
        payload["email"] = f"test_{unique_id}_{test_name.replace(' ', '_').lower()}@example.com"
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register/agent", json=payload)
        print(f"Status Code: {response.status_code}")
        try:
            res_json = response.json()
            if response.status_code == 422:
                print("Validation Errors:")
                for err in res_json.get('detail', []):
                    print(f"  - {err.get('loc')}: {err.get('msg')} ({err.get('type')})")
            else:
                print(f"Response: {json.dumps(res_json, indent=2)}")
        except:
            print(f"Raw Response: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

valid_data_template = {
    "agency_name": "Test Agency",
    "company_legal_name": "Test Company",
    "domain": "test.local",
    "business_address": "123 Test St",
    "country": "India",
    "state": "Tamil Nadu",
    "city": "Chennai",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "9876543210",
    "password": "Password123!",
    "confirm_password": "Password123!"
}

# 1. Email Field Tests (Properly)
test_agent_registration({**valid_data_template, "email": "invalid-email"}, "Invalid Email Format (No Domain)", override_email=False)
test_agent_registration({**valid_data_template, "email": "test@.com"}, "Invalid Email Format (No Name)", override_email=False)
test_agent_registration({**valid_data_template, "email": "test@domain"}, "Invalid Email Format (No TLD)", override_email=False)
test_agent_registration({**valid_data_template, "email": "test@domain..com"}, "Invalid Email Format (Double Dot)", override_email=False)

# 2. Domain Field Tests (Properly)
test_agent_registration({**valid_data_template, "domain": "not a domain"}, "Domain with Spaces", override_email=True)
test_agent_registration({**valid_data_template, "domain": "http://domain.com"}, "Domain with Protocol", override_email=True)
