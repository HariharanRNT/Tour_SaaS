import requests
import json

try:
    headers = {"X-Domain": "rnt.local"}
    response = requests.get("http://127.0.0.1:8000/api/v1/packages?search=Kochi", headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(f"Total packages found: {data.get('total')}")
        packages = data.get('packages', [])
        for pkg in packages:
            print(f"Title: {pkg['title']}, Flights Enabled: {pkg.get('flights_enabled')}, Origins: {pkg.get('flight_origin_cities')}")
    else:
        print(f"API Error: {response.status_code}, Response: {response.text}")
except Exception as e:
    print(f"Error connecting to API: {e}")
