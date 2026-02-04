import asyncio
import sys
import os

sys.path.append(os.getcwd())

from app.database import engine
from sqlalchemy import text

async def debug_destinations():
    try:
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT p.destination, pi.image_url FROM packages p JOIN package_images pi ON p.id = pi.package_id WHERE p.destination IN ('Mumbai', 'Chennai')"))
            imgs = res.fetchall()
            print(f"Images found: {imgs}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_destinations())
