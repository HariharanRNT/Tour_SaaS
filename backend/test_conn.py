import requests
import sys

def test_connection():
    urls = [
        "http://127.0.0.1:8000/api/v1/theme/public?domain=haritravels.local",
        "http://localhost:8000/api/v1/theme/public?domain=haritravels.local"
    ]
    for url in urls:
        print(f"Testing {url}...")
        try:
            r = requests.get(url, timeout=5)
            print(f"Status: {r.status_code}")
            print(f"Content: {r.text[:100]}...")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_connection()
