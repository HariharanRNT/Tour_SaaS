
import asyncio
from app.database import engine
from sqlalchemy import text
import json

async def verify_inclusions():
    print("Testing Inclusions persistence...")
    test_inclusions = {
        "flights": {"included": True, "details": "Verification test flights"},
        "hotel": {"included": False, "details": ""}
    }
    
    async with engine.connect() as conn:
        # Get first package
        res = await conn.execute(text("SELECT id, title FROM packages LIMIT 1"))
        pkg = res.fetchone()
        if not pkg:
            print("No packages found to test.")
            return
        
        pkg_id = pkg[0]
        print(f"Testing with package: {pkg.title} ({pkg_id})")
        
        # Update inclusions
        await conn.execute(
            text("UPDATE packages SET inclusions = :inclusions WHERE id = :id"),
            {"inclusions": json.dumps(test_inclusions), "id": pkg_id}
        )
        await conn.commit()
        print("Update committed to database.")
        
        # Verify read back
        res = await conn.execute(text("SELECT inclusions FROM packages WHERE id = :id"), {"id": pkg_id})
        updated_pkg = res.fetchone()
        print(f"Inclusions read back: {updated_pkg[0]}")
        
        if updated_pkg[0] == test_inclusions:
            print("Verification SUCCESS: Inclusions stored correctly.")
        else:
            print("Verification FAILED: Inclusions mismatch.")

if __name__ == "__main__":
    asyncio.run(verify_inclusions())
