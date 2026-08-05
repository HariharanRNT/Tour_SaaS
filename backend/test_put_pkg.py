import requests
import json
import sys

# Get token
token_script = r"C:\Users\santh\.gemini\antigravity-ide\brain\a49aac23-2da8-47f5-a1eb-64607223317c\scratch\get_token.py"
# We'll just run login here
response = requests.post("http://localhost:8000/api/v1/auth/login", data={"username": "agent@example.com", "password": "password123"})
if response.status_code != 200:
    print("Login failed")
    sys.exit(1)

token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Get package
pkg_id = "22d0c4c7-c57f-47ce-a93d-575bc6adda1d"
get_resp = requests.get(f"http://localhost:8000/api/v1/agent/packages/{pkg_id}", headers=headers)
print("Before Update:", get_resp.json().get("advance_cancellation_enabled"))

# Update package
update_payload = get_resp.json()
update_payload["advance_cancellation_enabled"] = True
# remove some fields that might fail
del update_payload["id"]
del update_payload["created_at"]
del update_payload["updated_at"]
if "images" in update_payload: del update_payload["images"]
if "itinerary_items" in update_payload: del update_payload["itinerary_items"]
if "trip_styles" in update_payload: del update_payload["trip_styles"]
if "activity_tags" in update_payload: del update_payload["activity_tags"]
if "availability" in update_payload: del update_payload["availability"]

put_resp = requests.put(f"http://localhost:8000/api/v1/agent/packages/{pkg_id}", headers=headers, json=update_payload)
print("PUT Status:", put_resp.status_code)
if put_resp.status_code == 200:
    print("After Update:", put_resp.json().get("advance_cancellation_enabled"))
else:
    print(put_resp.text)

