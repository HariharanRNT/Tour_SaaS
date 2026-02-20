import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv("backend/.env")
DATABASE_URL = os.getenv("DATABASE_URL")

async def inspect():
    if not DATABASE_URL:
        print("DATABASE_URL not found")
        return
    engine = create_async_engine(DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"))
    async with engine.connect() as conn:
        print("--- Constraints ---")
        result = await conn.execute(text("""
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            WHERE t.relname = 'agent_themes'
        """))
        for row in result:
            print(f"- {row[0]}: {row[1]}")
            
        print("\--- Indexes ---")
        result = await conn.execute(text("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'agent_themes'
        """))
        for row in result:
            print(f"- {row[0]}: {row[1]}")

if __name__ == "__main__":
    asyncio.run(inspect())
