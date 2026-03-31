import sys
from pydantic import ValidationError

sys.path.append('backend')
from app.schemas import PackageResponse, PackageCreate, TravelerBase, PackageStatus
from datetime import datetime
from uuid import uuid4

def test_fix():
    print("Running fix verification...")
    
    # 1. Test PackageResponse with empty fields (Legacy Data Sim)
    try:
        p = PackageResponse(
            id=uuid4(),
            slug="test-slug",
            status=PackageStatus.PUBLISHED,
            is_public=True,
            created_at=datetime.now(),
            title="",               # Empty title (formerly failed)
            description="",         # Empty description (fixed)
            destination="",         # Empty destination (fixed)
            duration_days=5,
            duration_nights=4,
            price_per_person=100.0,
            max_group_size=10
        )
        print("PASS: PackageResponse allows empty legacy fields.")
    except ValidationError as e:
        print(f"FAIL: PackageResponse still rejects empty fields: {e}")

    # 2. Test PackageCreate with empty fields (New Data Strictness)
    try:
        PackageCreate(
            title="Test Package",
            description="",         # Should fail
            destination="Paris",
            country="France",
            duration_days=5,
            duration_nights=4,
            price_per_person=100.0
        )
        print("FAIL: PackageCreate allowed empty description.")
    except ValidationError:
        print("PASS: PackageCreate rejects empty description.")

    # 3. Test TravelerBase with empty fields
    try:
        TravelerBase(first_name="John", last_name="Doe", nationality="")
        print("PASS: TravelerBase allows empty nationality.")
    except ValidationError as e:
        print(f"FAIL: TravelerBase rejects empty nationality: {e}")

if __name__ == "__main__":
    test_fix()
