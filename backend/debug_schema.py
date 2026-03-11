
import asyncio
from sqlalchemy import text
from app.database import engine

async def check_schema():
    async with engine.connect() as conn:
        # Check popular_destinations table
        try:
            result = await conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'popular_destinations'
                ORDER BY ordinal_position;
            """))
            print("\nColumns in popular_destinations:")
            for row in result:
                print(f"- {row.column_name}: {row.data_type}")
        except Exception as e:
            print(f"Error checking schema: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema())
