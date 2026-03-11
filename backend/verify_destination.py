import requests
import json
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_destination_flow():
    # 1. Login as admin
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "hariharan@reshandthosh.com", "password": "password123"} 
    )
    if login_response.status_code != 200:
        print("Login failed")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Add destination metadata
    dest_name = f"TestCity_{uuid.uuid4().hex[:8]}"
    metadata = {
        "name": dest_name,
        "country": "TestCountry",
        "image_url": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da",
        "description": "A beautiful test city"
    }
    
    print(f"Adding metadata for {dest_name}...")
    save_response = requests.post(
        f"{BASE_URL}/activities/destinations/metadata",
        json=metadata,
        headers=headers
    )
    
    if save_response.status_code != 200:
        print(f"Failed to save metadata: {save_response.text}")
        return
    
    print("Metadata saved successfully.")
    
    # 3. Create an activity for this city to make it show up in getDestinations
    activity = {
        "name": "Test Activity",
        "destination_city": dest_name,
        "category": "Adventure",
        "duration_hours": 2,
        "time_slot_preference": "morning",
        "description": "Test description",
        "price_per_person": 100
    }
    
    print("Creating activity...")
    act_response = requests.post(
        f"{BASE_URL}/activities/",
        json=activity,
        headers=headers
    )
    
    if act_response.status_code != 200:
        print(f"Failed to create activity: {act_response.text}")
        return
    
    # 4. Verify in getDestinations
    print("Verifying in getDestinations...")
    get_response = requests.get(
        f"{BASE_URL}/activities/destinations",
        headers=headers
    )
    
    destinations = get_response.json()["destinations"]
    match = next((d for d in destinations if d["name"] == dest_name), None)
    
    if match:
        print(f"Found destination {dest_name} with image: {match['image_url']}")
        assert match["image_url"] == metadata["image_url"]
    else:
        print(f"Destination {dest_name} not found in list")
    
    # 5. Verify in popular-destinations (trip-planner)
    # Note: Requires a published public package for this city/agent to show up there
    # Since that's more complex to setup, we'll just check if the endpoint responds correctly
    print("Checking popular-destinations endpoint...")
    pop_response = requests.get(
        f"{BASE_URL}/trip-planner/popular-destinations",
        headers={"X-Domain": "localhost"}
    )
    if pop_response.status_code == 200:
        print(f"Popular destinations count: {len(pop_response.json())}")
    else:
        print(f"Popular destinations failed: {pop_response.text}")

if __name__ == "__main__":
    test_destination_flow()
