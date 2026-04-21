
from app.schemas.packages import PackageUpdate
import json

def test_pydantic_validation():
    print("Testing Pydantic validation for PackageUpdate...")
    data = {
        "title": "Updated Package",
        "inclusions": {
            "flights": {"included": True, "details": "Flights included"},
            "other": {"included": True, "details": "Something special"}
        }
    }
    
    update_model = PackageUpdate(**data)
    dumped = update_model.dict(exclude_unset=True)
    print(f"Validated data: {json.dumps(dumped, indent=2)}")
    
    if "inclusions" in dumped:
        print("SUCCESS: Inclusions field preserved after validation.")
    else:
        print("FAILED: Inclusions field missing after validation.")

if __name__ == "__main__":
    test_pydantic_validation()
