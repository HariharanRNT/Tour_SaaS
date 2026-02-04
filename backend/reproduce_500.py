import requests
import json

url = "http://localhost:8000/api/v1/agent/packages"
headers = {
    "Content-Type": "application/json",
    "Origin": "http://rnt.local:3000",
    "X-Domain": "rnt.local"
}

# Mock data
data = {
    "title": "Test Package",
    "destination": "Test City",
    "country": "Test Country",
    "duration_days": 3,
    "duration_nights": 2,
    "price_per_person": 1000,
    "max_group_size": 10,
    "description": "Test description",
    "included_items": [],
    "excluded_items": []
}

print("Testing OPTIONS request...")
options_res = requests.options(url, headers={
    "Origin": "http://rnt.local:3000",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "Content-Type,Authorization"
})
print(f"OPTIONS status: {options_res.status_code}")
print(f"CORS Headers: {dict(options_res.headers)}")

# This will fail with 401 likely, but we want to see if it even gets to the backend logic or fails with CORS
print("\nTesting POST request (without auth)...")
try:
    post_res = requests.post(url, headers=headers, json=data)
    print(f"POST status: {post_res.status_code}")
    print(f"CORS Headers: {dict(post_res.headers)}")
    print(f"Body: {post_res.text}")
except Exception as e:
    print(f"Error: {e}")
