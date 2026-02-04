import requests
import json

# Test Amadeus tours endpoint
print("Testing Amadeus Tours API Integration...")
print("=" * 60)

try:
    response = requests.get(
        'http://localhost:8000/api/v1/tours/search',
        params={
            'destination': 'Singapore',
            'radius': 50
        },
        timeout=30
    )
    
    print(f"Status Code: {response.status_code}")
    print()
    
    if response.status_code == 200:
        data = response.json()
        
        print(f"Success: {data.get('success')}")
        print(f"Destination: {data.get('destination')}")
        print(f"Total Results: {data.get('total_results')}")
        print(f"Supplier: {data.get('supplier')}")
        print()
        
        if data.get('location'):
            loc = data['location']
            print(f"Location: {loc.get('city')}, {loc.get('country')}")
            print(f"Coordinates: {loc.get('latitude')}, {loc.get('longitude')}")
            print()
        
        if data.get('tours') and len(data['tours']) > 0:
            print(f"Sample Tours (showing first 3):")
            print("-" * 60)
            
            for i, tour in enumerate(data['tours'][:3], 1):
                print(f"\n{i}. {tour.get('title')}")
                print(f"   Price: {tour.get('price_per_person')} {tour.get('currency')}")
                print(f"   Duration: {tour.get('duration')}")
                print(f"   Rating: {tour.get('rating')}")
                print(f"   ID: {tour.get('id')}")
        else:
            print("No tours found")
    else:
        print(f"Error: {response.text}")
        
except Exception as e:
    print(f"Error: {str(e)}")
