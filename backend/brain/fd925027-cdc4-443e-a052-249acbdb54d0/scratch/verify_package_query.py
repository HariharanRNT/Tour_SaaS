
import asyncio
from sqlalchemy import select
from app.database import engine
from app.models import Package

async def verify_query():
    print("Verifying SQLAlchemy query for Package...")
    try:
        async with engine.connect() as conn:
            stmt = select(Package).limit(1)
            result = await conn.execute(stmt)
            row = result.fetchone()
            print("Query successful!")
            if row:
                 # Check if inclusions/exclusions are present in the row
                 # Depending on how the row is returned (mapping or tuple)
                 # With select(Package), it returns full objects if using session, 
                 # but with engine.connect() it returns Row objects.
                 print(f"Sample data - Inclusions: {row.inclusions}")
                 print(f"Sample data - Exclusions: {row.exclusions}")
            else:
                print("No packages found, but query succeeded.")
    except Exception as e:
        print(f"Query failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_query())
