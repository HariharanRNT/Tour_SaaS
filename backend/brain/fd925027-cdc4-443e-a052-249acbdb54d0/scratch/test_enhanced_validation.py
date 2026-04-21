
from app.schemas.package_schemas import PackageWithItineraryResponse
from decimal import Decimal
import json
import uuid

def test_enhanced_response_validation():
    print("Testing Pydantic validation for PackageWithItineraryResponse...")
    data = {
        "id": str(uuid.uuid4()),
        "title": "Enhanced Trip",
        "destination": "Paris",
        "duration_days": 5,
        "price_per_person": Decimal("1000.00"),
        "description": "Lovely trip",
        "itinerary_by_day": [],
        "inclusions": {
            "flights": {"included": True, "details": "Round trip"}
        },
        "exclusions": {
            "personal": {"included": False, "details": "Personal items"}
        }
    }
    
    response_model = PackageWithItineraryResponse(**data)
    dumped = response_model.dict()
    print(f"Validated inclusions: {json.dumps(dumped.get('inclusions'), indent=2)}")
    print(f"Validated exclusions: {json.dumps(dumped.get('exclusions'), indent=2)}")
    
    if dumped.get('inclusions') and dumped.get('exclusions'):
        print("SUCCESS: Inclusions and Exclusions preserved in enhanced response.")
    else:
        print("FAILED: Fields missing from enhanced response.")

if __name__ == "__main__":
    test_enhanced_response_validation()
