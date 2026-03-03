import sys
import os
import asyncio

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app.models import Activity

async def init_models():
    print("Creating activities table...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Activity.__table__.create, checkfirst=True)
        print("Table created successfully!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(init_models())
