import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1"

def test_agent_registration(payload, test_name):
    print(f"\n--- Testing: {test_name} ---")
    try:
        response = requests.post(f"{BASE_URL}/auth/register/agent", json=payload)
        print(f"Status Code: {response.status_code}")
        try:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"Raw Response: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

# Common valid data
valid_data = {
    "agency_name": "Test Agency",
    "company_legal_name": "Test Company",
    "domain": "test.local",
    "business_address": "123 Test St",
    "country": "India",
    "state": "Tamil Nadu",
    "city": "Chennai",
    "first_name": "John",
    "last_name": "Doe",
    "email": "tester@example.com",
    "phone": "9876543210",
    "password": "Password123!",
    "confirm_password": "Password123!"
}

# 1. Text Field Tests (Agency Name)
# Empty
test_agent_registration({**valid_data, "agency_name": ""}, "Empty Agency Name")
test_agent_registration({**valid_data, "agency_name": "   "}, "Spaces Agency Name")

# Overflow
test_agent_registration({**valid_data, "agency_name": "A" * 2000}, "Overflow Agency Name (2000 chars)")

# Special Characters & Injections
test_agent_registration({**valid_data, "agency_name": "!@#$%^&*()_+-=[]{}|;':\",.<>?/`~"}, "Special Chars Agency Name")
test_agent_registration({**valid_data, "agency_name": "' OR '1'='1; DROP TABLE users;--"}, "SQLi Agency Name")
test_agent_registration({**valid_data, "agency_name": "<script>alert('XSS')</script>"}, "XSS Agency Name")
test_agent_registration({**valid_data, "agency_name": "ÄÖÜäöü, 中文, العربية, हिन्दी, 😀🔥"}, "Unicode/Emoji Agency Name")

# 2. Email Field Tests
test_agent_registration({**valid_data, "email": "testgmail.com"}, "Invalid Email (No @)")
test_agent_registration({**valid_data, "email": "test@@gmail.com"}, "Invalid Email (Double @)")
test_agent_registration({**valid_data, "email": "' OR 1=1--@gmail.com"}, "SQLi Email")
test_agent_registration({**valid_data, "email": "a" * 300 + "@gmail.com"}, "Overflow Email")

# 3. Password Field Tests
test_agent_registration({**valid_data, "password": "short", "confirm_password": "short"}, "Short Password")
test_agent_registration({**valid_data, "password": "   ", "confirm_password": "   "}, "Spaces Password")
test_agent_registration({**valid_data, "password": "12345678", "confirm_password": "12345678"}, "Weak Password (Numbers)")
test_agent_registration({**valid_data, "password": "Password123!", "confirm_password": "Mismatch123!"}, "Password Mismatch")

# 4. Phone Field Tests
test_agent_registration({**valid_data, "phone": "123"}, "Short Phone")
test_agent_registration({**valid_data, "phone": "ABCDEFGHIJ"}, "Letters in Phone")
test_agent_registration({**valid_data, "phone": "+91-98765-43210"}, "Formatted Phone")
