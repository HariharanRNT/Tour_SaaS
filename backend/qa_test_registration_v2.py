import requests
import json
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_agent_registration(payload, test_name):
    print(f"\n--- Testing: {test_name} ---")
    # Use a unique email for each test to avoid 409 Conflict
    unique_id = str(uuid.uuid4())[:8]
    payload["email"] = f"test_{unique_id}_{test_name.replace(' ', '_').lower()}@example.com"
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register/agent", json=payload)
        print(f"Status Code: {response.status_code}")
        try:
            res_json = response.json()
            # If 422, print validation errors clearly
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

# Common valid data template
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

# --- Execution ---

# 1. Text Field Tests (Agency Name)
test_agent_registration({**valid_data_template, "agency_name": ""}, "Empty Agency Name")
test_agent_registration({**valid_data_template, "agency_name": "   "}, "Spaces Agency Name")
test_agent_registration({**valid_data_template, "agency_name": "A" * 2000}, "Overflow Agency Name")
test_agent_registration({**valid_data_template, "agency_name": "' OR '1'='1;--"}, "SQLi Agency Name")
test_agent_registration({**valid_data_template, "agency_name": "<script>alert(1)</script>"}, "XSS Agency Name")

# 2. Email Field Tests
test_agent_registration({**valid_data_template, "email": "invalid-email"}, "Invalid Email Format")
test_agent_registration({**valid_data_template, "email": "a" * 300 + "@example.com"}, "Overflow Email")

# 3. Phone Field Tests
test_agent_registration({**valid_data_template, "phone": "123"}, "Short Phone")
test_agent_registration({**valid_data_template, "phone": "not-a-number"}, "Alpha Phone")

# 4. Domain Field Tests
test_agent_registration({**valid_data_template, "domain": ""}, "Empty Domain")
test_agent_registration({**valid_data_template, "domain": "invalid_domain"}, "Invalid Domain Format")
