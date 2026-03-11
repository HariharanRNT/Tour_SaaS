import requests
import json

try:
    headers = {"X-Domain": "rnt.local"}
    response = requests.get("http://127.0.0.1:8000/api/v1/packages?search=Kochi", headers=headers)
    if response.status_code == 200:
        data = response.json()
        packages = data.get('packages', [])
        for pkg in packages:
            if 'Kochi' in pkg['title'] or 'Kochi' in pkg['slug']:
                origins = pkg.get('flight_origin_cities')
                print(f"Package: {pkg['title']}")
                print(f"Origins Type: {type(origins)}")
                print(f"Origins Content: {origins}")
                if isinstance(origins, list):
                    print("SUCCESS: Origins is a list")
                else:
                    print("FAILURE: Origins is not a list")
    else:
        print(f"API Error: {response.status_code}")
except Exception as e:
    print(f"Error connecting to API: {e}")
