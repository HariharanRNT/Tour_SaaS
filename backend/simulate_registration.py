import httpx
import asyncio
import uuid

async def test_registration():
    url = "http://localhost:8000/api/v1/auth/register/agent"
    email = f"test_agent_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email,
        "password": "Password123!",
        "first_name": "Test",
        "last_name": "Agent",
        "agency_name": "Resh and Thosh Technologies Pvt Ltd",
        "company_legal_name": "Resh and Thosh Technologies Pvt Ltd",
        "domain": f"reshandthosh-{uuid.uuid4().hex[:4]}.com",
        "business_address": "123 Test St",
        "country": "India",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "phone": "+919876543210",
        "confirm_password": "Password123!"
    }
    
    print(f"Testing registration for {email}...")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=30.0)
            print(f"Status Code: {response.status_code}")
            print(f"Response Body: {response.text}")
            
            with open("registration_test_result.txt", "w") as f:
                f.write(f"Status Code: {response.status_code}\n")
                f.write(f"Response Body: {response.text}\n")
        except Exception as e:
            print(f"Error: {e}")
            with open("registration_test_result.txt", "w") as f:
                f.write(f"Error: {e}\n")

if __name__ == "__main__":
    asyncio.run(test_registration())
