import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Replicate database connection logic
DATABASE_URL = "postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas"
engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def inspect():
    async with AsyncSessionLocal() as db:
        print("--- Agents and Users ---")
        stmt = text("SELECT u.id as user_id, u.email, u.role, a.domain FROM users u LEFT JOIN agents a ON u.id = a.user_id WHERE u.role IN ('AGENT', 'SUB_USER')")
        result = await db.execute(stmt)
        for row in result.fetchall():
            print(f"User: {row.user_id} | Email: {row.email} | Role: {row.role} | Domain: {row.domain}")

        print("\n--- Destinations (Shimla and Tokyo) ---")
        stmt = text("SELECT id, name, agent_id, is_popular, is_active FROM popular_destinations WHERE name IN ('Shimla', 'Tokyo', 'Simal')")
        result = await db.execute(stmt)
        for row in result.fetchall():
            print(f"ID: {row.id} | Name: {row.name} | Agent: {row.agent_id} | Popular: {row.is_popular} | Active: {row.is_active}")

        print("\n--- Popular destinations (is_popular=True) ---")
        stmt = text("SELECT name, agent_id FROM popular_destinations WHERE is_popular = True")
        result = await db.execute(stmt)
        for row in result.fetchall():
            print(f"Name: {row.name} | Agent: {row.agent_id}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(inspect())
