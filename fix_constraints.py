import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv("backend/.env")
DATABASE_URL = os.getenv("DATABASE_URL")

async def fix():
    if not DATABASE_URL:
        print("DATABASE_URL not found")
        return
    engine = create_async_engine(DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"))
    async with engine.begin() as conn:
        try:
            # Drop the index if it exists
            await conn.execute(text("DROP INDEX IF EXISTS agent_themes_agent_id_key CASCADE"))
            print("Attempted DROP INDEX agent_themes_agent_id_key CASCADE")
            
            # Also try dropping as constraint just to be absolutely sure
            await conn.execute(text("ALTER TABLE agent_themes DROP CONSTRAINT IF EXISTS agent_themes_agent_id_key CASCADE"))
            print("Attempted DROP CONSTRAINT agent_themes_agent_id_key CASCADE")
            
        except Exception as e:
            print(f"Final error check: {e}")

if __name__ == "__main__":
    asyncio.run(fix())
