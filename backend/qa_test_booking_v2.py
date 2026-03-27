import requests
import json
from datetime import date, timedelta
import uuid

BASE_URL = "http://localhost:8000/api/v1"
PACKAGE_ID = "0c953b71-7d9d-43c3-bf8d-3e9a8de3b677"
DOMAIN = "rnt.local"

def get_token():
    email = f"qa_booking_{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(
        f"{BASE_URL}/auth/register", 
        json={
            "email": email,
            "password": "Password123!",
            "first_name": "QA",
            "last_name": "Booking",
            "phone": "9999999999"
        },
        headers={"X-Domain": DOMAIN}
    )
    res = r.json()
    token = res.get('access_token')
    if not token:
        print(f"Failed to get token: {res}")
    return token

def test_booking(payload, test_name, token):
    print(f"\n--- Testing: {test_name} ---")
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Domain": DOMAIN
    }
    try:
        response = requests.post(f"{BASE_URL}/bookings", json=payload, headers=headers)
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

# Setup
token = get_token()
if not token:
    exit(1)

travel_date = (date.today() + timedelta(days=30)).isoformat()
dob = (date.today() - timedelta(days=10000)).isoformat()

valid_traveler = {
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": dob,
    "gender": "Male",
    "nationality": "Indian",
    "is_primary": True
}

# --- Execution ---

# 1. Traveler Count Mismatch
test_booking({
    "package_id": PACKAGE_ID,
    "travel_date": travel_date,
    "number_of_travelers": 2,
    "travelers": [valid_traveler],
    "special_requests": ""
}, "Traveler Count Mismatch (Req 2, Prov 1)", token)

# 2. Extreme Traveler Count (Pydantic ge=1)
test_booking({
    "package_id": PACKAGE_ID,
    "travel_date": travel_date,
    "number_of_travelers": 0,
    "travelers": [],
    "special_requests": ""
}, "Zero Travelers", token)

# 3. Invalid Travel Date (Past)
past_date = (date.today() - timedelta(days=1)).isoformat()
test_booking({
    "package_id": PACKAGE_ID,
    "travel_date": past_date,
    "number_of_travelers": 1,
    "travelers": [valid_traveler]
}, "Past Travel Date", token)

# 4. Malicious Special Requests
test_booking({
    "package_id": PACKAGE_ID,
    "travel_date": travel_date,
    "number_of_travelers": 1,
    "travelers": [valid_traveler],
    "special_requests": "<script>alert('XSS')</script> ' OR 1=1--"
}, "XSS/SQLi in Special Requests", token)

# 5. Extreme Values in Traveler Names
overflow_traveler = {**valid_traveler, "first_name": "A" * 1000, "last_name": "B" * 1000}
test_booking({
    "package_id": PACKAGE_ID,
    "travel_date": travel_date,
    "number_of_travelers": 1,
    "travelers": [overflow_traveler]
}, "Overflow Traveler Names", token)

# 6. Invalid DOB (Future)
future_dob = (date.today() + timedelta(days=1)).isoformat()
future_dob_traveler = {**valid_traveler, "date_of_birth": future_dob}
test_booking({
    "package_id": PACKAGE_ID,
    "travel_date": travel_date,
    "number_of_travelers": 1,
    "travelers": [future_dob_traveler]
}, "Future DOB", token)
