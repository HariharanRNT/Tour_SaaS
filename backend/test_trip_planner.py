"""Test trip planner endpoints"""
import requests

BASE_URL = "http://localhost:8000/api/v1/trip-planner"

print("Testing Trip Planner Endpoints\n" + "="*50)

# Test 1: Get popular destinations
print("\n1. Getting popular destinations...")
response = requests.get(f"{BASE_URL}/popular-destinations")
print(f"Status: {response.status_code}")
if response.status_code == 200:
    destinations = response.json()
    print(f"✅ Found {len(destinations)} popular destinations")
    for dest in destinations[:3]:
        print(f"   - {dest['name']}, {dest['country']}")
else:
    print(f"❌ Failed: {response.text}")

# Test 2: Match destination (Tokyo - should match)
print("\n2. Matching destination: Tokyo, 7 days...")
response = requests.post(
    f"{BASE_URL}/match-destination",
    json={
        "destination": "Tokyo",
        "duration_days": 7,
        "category": "Adventure"
    }
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    result = response.json()
    if result['has_match']:
        print(f"✅ Match found! Score: {result['match_score']}")
        print(f"   Package: {result['package']['title']}")
        print(f"   Itinerary days: {len(result['package']['itinerary_by_day'])}")
    else:
        print("⚠️  No match found")
else:
    print(f"❌ Failed: {response.text}")

# Test 3: Create trip session
print("\n3. Creating trip planning session...")
response = requests.post(
    f"{BASE_URL}/create-session",
    json={
        "destination": "Tokyo",
        "duration_days": 7,
        "duration_nights": 6,
        "start_date": "2024-06-01",
        "travelers": {"adults": 2, "children": 1, "infants": 0},
        "preferences": {"category": "Adventure"}
    }
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    session = response.json()
    session_id = session['session_id']
    print(f"✅ Session created: {session_id}")
    print(f"   Has match: {session['has_match']}")
    print(f"   Match score: {session['match_score']}")
    print(f"   Itinerary days: {len(session['itinerary'])}")
    
    # Test 4: Get session
    print("\n4. Getting session...")
    response2 = requests.get(f"{BASE_URL}/session/{session_id}")
    print(f"Status: {response2.status_code}")
    if response2.status_code == 200:
        print("✅ Session retrieved successfully")
    else:
        print(f"❌ Failed: {response2.text}")
    
    # Test 5: Update session
    print("\n5. Updating session itinerary...")
    response3 = requests.put(
        f"{BASE_URL}/session/{session_id}",
        json={
            "itinerary": [
                {
                    "day_number": 1,
                    "morning": [{"title": "Custom Activity", "description": "Test"}],
                    "afternoon": [],
                    "evening": [],
                    "night": []
                }
            ]
        }
    )
    print(f"Status: {response3.status_code}")
    if response3.status_code == 200:
        print("✅ Session updated successfully")
    else:
        print(f"❌ Failed: {response3.text}")
else:
    print(f"❌ Failed: {response.text}")

print("\n" + "="*50)
print("Trip Planner API Tests Complete!")
