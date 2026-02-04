"""Test database connection"""
import asyncio
from app.database import engine
from sqlalchemy import text

async def test_connection():
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text('SELECT 1'))
            print('[OK] Database connected successfully!')
            print('Result:', result.scalar())
            
            # Test if packages table exists
            result = await conn.execute(text("SELECT COUNT(*) FROM packages"))
            count = result.scalar()
            print(f'[OK] Packages table exists with {count} records')
            
    except Exception as e:
        print('[ERROR] Database connection failed!')
        print('Error:', str(e))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_connection())
