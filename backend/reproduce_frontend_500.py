import requests

base_url = "http://localhost:8000/api/v1"
headers = {"X-Domain": "localhost"}

urls_to_test = [
    f"{base_url}/packages/config/destinations/popular",
    f"{base_url}/packages/config/suggestions?q=a",
    f"{base_url}/packages/config/suggestions?q=europe",
    f"{base_url}/packages",
    f"{base_url}/packages?package_mode=all",
    f"{base_url}/packages?package_mode=single",
    f"{base_url}/packages?package_mode=multi",
    f"{base_url}/packages?duration_min=1&duration_max=30",
    f"{base_url}/packages?price_min=0&price_max=500000",
    f"{base_url}/packages?trip_styles=Adventure&trip_styles=Leisure",
    f"{base_url}/packages?activities=Beach&activities=Mountain",
    f"{base_url}/packages?countries=India&countries=France",
    f"{base_url}/packages?search=Europe",
    f"{base_url}/packages?sort=recommended",
    f"{base_url}/packages?sort=price_asc",
    f"{base_url}/packages?sort=price_desc",
    f"{base_url}/packages?sort=duration_asc",
    f"{base_url}/packages?sort=duration_desc",
    f"{base_url}/packages?sort=newest",
    # Full complex query
    f"{base_url}/packages?search=test&package_mode=single&duration_min=2&duration_max=10&price_min=1000&price_max=50000&trip_styles=Adventure&activities=Beach&countries=India&sort=newest"
]

for url in urls_to_test:
    try:
        res = requests.get(url, headers=headers)
        if res.status_code == 500:
            print(f"FAILED (500): {url}")
            print(res.text)
        else:
            pass # print(f"OK ({res.status_code}): {url}")
    except Exception as e:
        print(f"ERROR: {url} - {e}")

print("Done testing endpoints.")
