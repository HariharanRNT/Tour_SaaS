"""Test the complete trip planner flow"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1/trip-planner"

print("Testing Complete Trip Planner Flow")
print("=" * 60)

# Step 1: Create a trip planning session
print("\n1. Creating trip planning session...")
session_data = {
    "destination": "Tokyo",
    "duration_days": 7,
    "duration_nights": 6,
    "start_date": "2024-06-01",
    "travelers": {
        "adults": 2,
        "children": 1,
        "infants": 0
    },
    "preferences": {
        "category": "Adventure",
        "include_flights": True,
        "include_hotels": True,
        "include_transfers": False,
        "departure_location": "New York"
    }
}

response = requests.post(f"{BASE_URL}/create-session", json=session_data)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    session = response.json()
    session_id = session['session_id']
    print(f"Session created: {session_id}")
    print(f"Has match: {session['has_match']}")
    print(f"Match score: {session.get('match_score', 0)}")
    print(f"Matched package ID: {session.get('matched_package_id', 'None')}")
    print(f"Itinerary days: {len(session.get('itinerary', []))}")
    
    # Step 2: Get the session
    print(f"\n2. Retrieving session {session_id}...")
    response2 = requests.get(f"{BASE_URL}/session/{session_id}")
    print(f"Status: {response2.status_code}")
    
    if response2.status_code == 200:
        retrieved_session = response2.json()
        print(f"Destination: {retrieved_session['destination']}")
        print(f"Duration: {retrieved_session['duration_days']} days / {retrieved_session['duration_nights']} nights")
        print(f"Travelers: {retrieved_session['travelers']}")
        
        # Step 3: Update itinerary
        print(f"\n3. Updating itinerary...")
        updated_itinerary = [
            {
                "day_number": 1,
                "morning": [
                    {"title": "Visit Senso-ji Temple", "description": "Ancient Buddhist temple in Asakusa"}
                ],
                "afternoon": [
                    {"title": "Explore Shibuya", "description": "Famous crossing and shopping district"}
                ],
                "evening": [],
                "night": []
            },
            {
                "day_number": 2,
                "morning": [
                    {"title": "Tokyo Tower", "description": "Iconic landmark with city views"}
                ],
                "afternoon": [],
                "evening": [],
                "night": []
            }
        ]
        
        response3 = requests.put(
            f"{BASE_URL}/session/{session_id}",
            json={"itinerary": updated_itinerary}
        )
        print(f"Status: {response3.status_code}")
        
        if response3.status_code == 200:
            print("Itinerary updated successfully!")
            
            # Print the frontend URL
            print(f"\n" + "=" * 60)
            print(f"Frontend URL:")
            print(f"http://localhost:3000/plan-trip/build?session={session_id}")
            print("=" * 60)
        else:
            print(f"Failed: {response3.text}")
    else:
        print(f"Failed: {response2.text}")
else:
    print(f"Failed: {response.text}")

print("\nTest Complete!")
