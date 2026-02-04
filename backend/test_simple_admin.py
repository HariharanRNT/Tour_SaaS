"""Test simplified admin endpoints"""
import requests

print("Testing simplified admin endpoints...")
print("=" * 50)

# Test package creation
print("\n1. Testing package creation...")
data = {
    'title': 'Test Package',
    'destination': 'Mumbai',
    'duration_days': 5,
    'duration_nights': 4,
    'price_per_person': 100,
    'max_group_size': 20,
    'description': 'Test package description'
}

response = requests.post('http://localhost:8000/api/v1/admin-simple/packages-simple', json=data)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    pkg = response.json()
    print(f"SUCCESS! Created package: {pkg['id']}")
    print(f"Title: {pkg['title']}")
    print(f"Slug: {pkg['slug']}")
    
    # Test getting package with itinerary
    print(f"\n2. Testing get package with itinerary...")
    response2 = requests.get(f'http://localhost:8000/api/v1/admin-simple/packages-simple/{pkg["id"]}')
    print(f"Status: {response2.status_code}")
    
    if response2.status_code == 200:
        data = response2.json()
        print(f"SUCCESS! Got package: {data['package']['title']}")
        print(f"Itinerary days: {len(data['itinerary_by_day'])}")
    else:
        print(f"FAILED: {response2.text}")
else:
    print(f"FAILED: {response.text}")

# Test list packages
print(f"\n3. Testing list packages...")
response3 = requests.get('http://localhost:8000/api/v1/admin-simple/packages-simple')
print(f"Status: {response3.status_code}")

if response3.status_code == 200:
    packages = response3.json()
    print(f"SUCCESS! Found {len(packages)} packages")
else:
    print(f"FAILED: {response3.text}")
