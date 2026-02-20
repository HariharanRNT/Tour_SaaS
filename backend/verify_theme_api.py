import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"
EMAIL = "hari@haritravels.local"
PASSWORD = "password123"

def login():
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": EMAIL, "password": PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10
        )
        response.raise_for_status()
        return response.json()["access_token"]
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def get_agent_theme(token):
    print("\n[GET] Fetching Agent Theme...")
    try:
        response = requests.get(
            f"{BASE_URL}/theme/agent",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        if response.status_code == 200:
            print("Success:", json.dumps(response.json(), indent=2))
            return response.json()
        else:
            print("Failed:", response.status_code, response.text)
            return None
    except Exception as e:
        print(f"Request failed: {e}")
        return None

def update_agent_theme(token, theme_id):
    print("\n[PUT] Updating Agent Theme...")
    try:
        update_data = {
            "primary_color": "hsl(0 100% 50%)", # Red
            "home_hero_title": "Verified Custom Hero Title"
        }
        response = requests.put(
            f"{BASE_URL}/theme/agent",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        if response.status_code == 200:
            print("Success:", json.dumps(response.json(), indent=2))
        else:
            print("Failed:", response.status_code, response.text)
    except Exception as e:
        print(f"Update failed: {e}")

def get_public_theme(domain):
    print(f"\n[GET] Fetching Public Theme for {domain}...")
    try:
        response = requests.get(
            f"{BASE_URL}/theme/public",
            params={"domain": domain},
            timeout=10
        )
        if response.status_code == 200:
            print("Success:", json.dumps(response.json(), indent=2))
        else:
            print("Failed:", response.status_code, response.text)
    except Exception as e:
        print(f"Public request failed: {e}")

def main():
    print("Starting Theme API Verification...")
    token = login()
    if not token:
        return

    theme = get_agent_theme(token)
    if theme:
        update_agent_theme(token, theme['id'])
        get_agent_theme(token) # Verify update
        
    get_public_theme("haritravels.local")

if __name__ == "__main__":
    main()
