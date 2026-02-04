
import requests
import json

def test_admin_stats():
    url = "http://localhost:8000/api/v1/admin-simple/dashboard-stats"
    try:
        print(f"Testing API: {url}")
        # Try without auth first since the code didn't show strict dependency
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Response Data:")
            print(json.dumps(data, indent=2))
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Request Failed: {e}")

if __name__ == "__main__":
    test_admin_stats()
