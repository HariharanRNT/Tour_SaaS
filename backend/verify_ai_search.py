import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"

def test_package_search():
    print("Testing AI Package Search Endpoint...")
    
    payload = {
        "message": "I want to go to Kerala for 5 days with a budget of 30000",
        "mode": "package_search"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/ai-assistant/chat", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success!")
            print(f"Message: {data.get('message')}")
            print(f"Tool Used: {data.get('tool_used')}")
            if data.get('tool_result'):
                print(f"Tool Result Count: {len(data.get('tool_result'))}")
                print(f"First Result: {data.get('tool_result')[0]}")
            else:
                print("⚠️ No tool result returned.")
        else:
            print(f"❌ Failed with status {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_package_search()
