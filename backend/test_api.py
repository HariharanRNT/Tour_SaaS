"""Test API endpoint via HTTP"""
import requests
import json

# Test GET endpoint
print("Testing GET /api/v1/admin/packages...")
try:
    response = requests.get("http://localhost:8000/api/v1/admin/packages")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"[OK] Got {len(data)} packages")
    else:
        print(f"[ERROR] Response: {response.text}")
except Exception as e:
    print(f"[ERROR] Request failed: {e}")

print("\n" + "="*50 + "\n")

# Test POST endpoint
print("Testing POST /api/v1/admin/packages...")
test_data = {
    "title": "API Test Package",
    "destination": "Delhi",
    "duration_days": 3,
    "duration_nights": 2,
    "category": "City",
    "price_per_person": 75.0,
    "max_group_size": 15,
    "description": "Testing via HTTP"
}

try:
    response = requests.post(
        "http://localhost:8000/api/v1/admin/packages",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        data = response.json()
        print(f"[OK] Package created: {data.get('id')}")
        print(f"Title: {data.get('title')}")
        print(f"Slug: {data.get('slug')}")
    else:
        print(f"[ERROR] Response: {response.text}")
except Exception as e:
    print(f"[ERROR] Request failed: {e}")
