import sys
from datetime import date
from decimal import Decimal
from pydantic import ValidationError

sys.path.append('backend')
from app.schemas import (
    UserUpdate, AgentGeneralSettingsUpdate, PackageAvailabilityBase, 
    ActivityUpdate, HomepageSettingsUpdate
)

def test_validation():
    print("Running validation tests...")
    
    # 1. UserUpdate XSS test
    try:
        u = UserUpdate(first_name="<script>alert(1)</script>")
        print(f"UserUpdate XSS: {u.first_name}")
        assert "<script>" not in u.first_name
    except Exception as e:
        print(f"UserUpdate XSS failed incorrectly: {e}")

    # 2. GST Range test
    try:
        AgentGeneralSettingsUpdate(gst_percentage=Decimal("-1.0"))
        print("FAIL: Negative GST allowed")
    except ValidationError:
        print("PASS: Negative GST rejected")

    # 3. Date Range test
    try:
        PackageAvailabilityBase(
            available_from=date(2023, 1, 2),
            available_to=date(2023, 1, 1)
        )
        print("FAIL: Invalid date range allowed")
    except ValidationError:
        print("PASS: Invalid date range rejected")

    # 4. Activity Rating test
    try:
        ActivityUpdate(title="Test", rating=6.0)
        print("FAIL: Rating > 5 allowed")
    except ValidationError:
        print("PASS: Rating > 5 rejected")

    # 5. Homepage URL test
    try:
        HomepageSettingsUpdate(backgroundImageUrl="javascript:alert(1)")
        print("FAIL: Malicious URL allowed")
    except ValidationError:
        print("PASS: Malicious URL rejected")

if __name__ == "__main__":
    test_validation()
