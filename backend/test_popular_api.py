import requests

def test_api():
    try:
        # Simulate rnt.local domain
        url = "http://localhost:8000/api/v1/trip-planner/popular-destinations"
        headers = {"X-Domain": "rnt.local"}
        response = requests.get(url, headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Content: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()
