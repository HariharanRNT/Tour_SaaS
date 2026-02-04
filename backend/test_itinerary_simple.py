"""Test itinerary endpoints"""
import requests

# Get a package
packages = requests.get('http://localhost:8000/api/v1/admin-simple/packages-simple').json()
if packages:
    pkg_id = packages[0]['id']
    print(f"Testing with package: {pkg_id}")
    
    # Add itinerary item
    print("\n1. Adding itinerary item...")
    response = requests.post(
        f'http://localhost:8000/api/v1/admin-simple/packages-simple/{pkg_id}/itinerary-items',
        json={
            'day_number': 1,
            'title': 'Morning Activity Test',
            'description': 'Test description',
            'time_slot': 'morning',
            'display_order': 0,
            'activities': [],
            'is_optional': False
        }
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        item = response.json()
        print(f"SUCCESS! Created item: {item['id']}")
        
        # Get package with itinerary
        print("\n2. Getting package with itinerary...")
        response2 = requests.get(f'http://localhost:8000/api/v1/admin-simple/packages-simple/{pkg_id}')
        print(f"Status: {response2.status_code}")
        if response2.status_code == 200:
            data = response2.json()
            print(f"SUCCESS! Itinerary days: {len(data['itinerary_by_day'])}")
            if data['itinerary_by_day']:
                day1 = data['itinerary_by_day'][0]
                print(f"Day 1 morning activities: {len(day1['morning'])}")
    else:
        print(f"FAILED: {response.text}")
else:
    print("No packages found")
