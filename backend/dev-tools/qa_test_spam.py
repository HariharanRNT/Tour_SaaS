import asyncio
import httpx
import uuid
from datetime import date, timedelta

BASE_URL = "http://localhost:8000/api/v1"
PACKAGE_ID = "0c953b71-7d9d-43c3-bf8d-3e9a8de3b677"
DOMAIN = "rnt.local"

async def get_token():
    email = f"qa_spam_{uuid.uuid4().hex[:6]}@example.com"
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{BASE_URL}/auth/register", 
            json={
                "email": email,
                "password": "Password123!",
                "first_name": "QA",
                "last_name": "Spam",
                "phone": "9999999999"
            },
            headers={"X-Domain": DOMAIN}
        )
        return r.json().get('access_token')

async def send_booking(token, payload, client):
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Domain": DOMAIN
    }
    return await client.post(f"{BASE_URL}/bookings", json=payload, headers=headers)

async def test_spam():
    token = await get_token()
    if not token:
        print("Failed to get token")
        return

    travel_date = (date.today() + timedelta(days=30)).isoformat()
    dob = (date.today() - timedelta(days=10000)).isoformat()
    
    payload = {
        "package_id": PACKAGE_ID,
        "travel_date": travel_date,
        "number_of_travelers": 1,
        "travelers": [{
            "first_name": "Spam",
            "last_name": "User",
            "date_of_birth": dob,
            "gender": "Male",
            "nationality": "Indian",
            "is_primary": True
        }],
        "special_requests": "SPAM TEST"
    }

    print("\n--- Testing: Rapid Submission Spam (5 requests simultaneously) ---")
    async with httpx.AsyncClient() as client:
        # Create 5 identical requests
        tasks = [send_booking(token, payload, client) for _ in range(5)]
        results = await asyncio.gather(*tasks)
        
        for i, res in enumerate(results):
            print(f"Request {i+1}: Status {res.status_code}")
            if res.status_code == 201:
                print(f"  - Booking Ref: {res.json().get('booking_reference')}")
            else:
                print(f"  - Detail: {res.text}")

if __name__ == "__main__":
    asyncio.run(test_spam())
