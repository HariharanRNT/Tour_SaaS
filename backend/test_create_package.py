"""Test package creation endpoint"""
import asyncio
from app.database import get_db
from app.models import Package, PackageStatus
from sqlalchemy import select

async def test_create_package():
    try:
        async for db in get_db():
            import uuid
            
            # Generate unique slug
            base_slug = "test-package"
            unique_slug = f"{base_slug}-{str(uuid.uuid4())[:8]}"
            
            # Create package
            new_package = Package(
                title="Test Package",
                slug=unique_slug,
                destination="Mumbai",
                duration_days=5,
                duration_nights=4,
                category="Adventure",
                price_per_person=50.0,
                max_group_size=20,
                description="Test package creation",
                status=PackageStatus.DRAFT,
                is_template=False
            )
            
            print(f"Creating package with slug: {unique_slug}")
            
            db.add(new_package)
            await db.commit()
            await db.refresh(new_package)
            
            print(f"[OK] Package created successfully!")
            print(f"ID: {new_package.id}")
            print(f"Title: {new_package.title}")
            print(f"Slug: {new_package.slug}")
            
            # Verify it was saved
            stmt = select(Package).where(Package.id == new_package.id)
            result = await db.execute(stmt)
            saved_package = result.scalar_one_or_none()
            
            if saved_package:
                print(f"[OK] Package verified in database!")
            else:
                print(f"[ERROR] Package not found in database!")
            
            break
            
    except Exception as e:
        print('[ERROR] Failed to create package!')
        print('Error:', str(e))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_create_package())
