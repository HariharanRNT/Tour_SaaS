import json
from pydantic import ValidationError
from app.schemas import AgentRegistration

def test_validation():
    payload = {
        "email": "test@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "first_name": "Test",
        "last_name": "Agent",
        "agency_name": "Resh and Thosh Technologies Pvt Ltd",
        "company_legal_name": "Resh and Thosh Technologies Pvt Ltd",
        "domain": "https://aaa.com",
        "business_address": "123 Test St",
        "country": "India",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "phone": "+919876543210"
    }
    
    try:
        agent = AgentRegistration(**payload)
        print("Validation Successful!")
        print(agent.model_dump())
    except ValidationError as e:
        print("Validation Failed!")
        print(e.json())

if __name__ == "__main__":
    test_validation()
