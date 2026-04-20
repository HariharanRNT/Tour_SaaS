"""
Inspect PostgreSQL database to see actual state of popular_destinations table
and what packages/activities exist per destination.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'backend'))

async def main():
    from app.database import AsyncSessionLocal
    from sqlalchemy import text

    async with AsyncSessionLocal() as db:
        print("=" * 60)
        print("--- All rows in popular_destinations table ---")
        result = await db.execute(text(
            "SELECT id, name, agent_id, country, is_popular, is_active, display_order FROM popular_destinations ORDER BY name;"
        ))
        rows = result.fetchall()
        if not rows:
            print("  !! TABLE IS EMPTY !!")
        for row in rows:
            print(f"  name={row.name!r:25} agent_id={str(row.agent_id)[:8]}...  popular={row.is_popular}  active={row.is_active}")

        print()
        print("--- Agent users (id, domain) ---")
        result = await db.execute(text(
            "SELECT u.id, a.domain, u.email FROM users u JOIN agents a ON a.user_id = u.id;"
        ))
        for row in result.fetchall():
            print(f"  email={row.email!r:35} id={str(row.id)[:8]}...  domain={row.domain!r}")

        print()
        print("--- Package destinations (distinct) ---")
        result = await db.execute(text(
            "SELECT destination, created_by, count(*) as cnt FROM packages GROUP BY destination, created_by ORDER BY destination;"
        ))
        for row in result.fetchall():
            print(f"  dest={row.destination!r:25} created_by={str(row.created_by)[:8]}...  count={row.cnt}")

        print()
        print("--- Activity destinations (distinct) ---")
        result = await db.execute(text(
            "SELECT destination_city, agent_id, count(*) as cnt FROM activities GROUP BY destination_city, agent_id ORDER BY destination_city;"
        ))
        for row in result.fetchall():
            print(f"  city={row.destination_city!r:25} agent_id={str(row.agent_id)[:8] if row.agent_id else 'NULL':12}  count={row.cnt}")

asyncio.run(main())
