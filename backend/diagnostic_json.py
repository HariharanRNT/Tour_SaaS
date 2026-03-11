import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
import json
from dotenv import load_dotenv

load_dotenv()

async def check():
    db_url = os.getenv('DATABASE_URL')
    engine = create_async_engine(db_url)
    data = {"agents": [], "packages": []}
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT user_id, agency_name, domain FROM agents"))
        agents = result.fetchall()
        for a in agents:
            data["agents"].append({"user_id": str(a[0]), "agency": a[1], "domain": a[2]})
            
        result = await conn.execute(text("SELECT id, title, created_by, is_public, flights_enabled, flight_origin_cities, flight_cabin_class, flight_price_included FROM packages WHERE title LIKE '%Kochi%'"))
        pkgs = result.fetchall()
        for p in pkgs:
            data["packages"].append({
                "id": str(p[0]), 
                "title": p[1], 
                "creator": str(p[2]), 
                "public": p[3], 
                "flights": p[4],
                "origins": p[5],
                "cabin": p[6],
                "price_included": p[7]
            })

    with open("results.json", "w") as f:
        json.dump(data, f, indent=2)
    print("Results saved to results.json")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
