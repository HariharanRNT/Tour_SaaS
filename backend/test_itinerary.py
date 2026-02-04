"""Test package itinerary endpoint"""
import requests

# Get first package
response = requests.get('http://localhost:8000/api/v1/packages/search?destination=&limit=1')
packages = response.json()

if packages:
    pkg_id = packages[0]['id']
    print(f"Testing package: {pkg_id}")
    print(f"Title: {packages[0]['title']}")
    
    # Get itinerary
    itinerary_response = requests.get(f'http://localhost:8000/api/v1/packages/{pkg_id}/itinerary')
    print(f"\nItinerary endpoint status: {itinerary_response.status_code}")
    
    if itinerary_response.status_code == 200:
        data = itinerary_response.json()
        print(f"Has itinerary_by_day: {'itinerary_by_day' in data}")
        if 'itinerary_by_day' in data:
            print(f"Number of days: {len(data['itinerary_by_day'])}")
            if data['itinerary_by_day']:
                day1 = data['itinerary_by_day'][0]
                print(f"Day 1 has morning activities: {len(day1.get('morning', []))}")
    else:
        print(f"Error: {itinerary_response.text}")
else:
    print("No packages found")
