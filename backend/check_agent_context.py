import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    db_url = os.getenv('DATABASE_URL')
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        print("Agents in DB:")
        result = await conn.execute(text("SELECT user_id, agency_name, domain FROM agents"))
        agents = result.fetchall()
        for a in agents:
            print(f"User ID: {a[0]}, Agency: {a[1]}, Domain: {a[2]}")
            
        print("\nKochi Package details:")
        result = await conn.execute(text("SELECT id, title, created_by, is_public, flights_enabled FROM packages WHERE title LIKE '%Kochi%'"))
        pkgs = result.fetchall()
        for p in pkgs:
            print(f"ID: {p[0]}, Title: {p[1]}, Created By: {p[2]}, Public: {p[3]}, Flights: {p[4]}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
