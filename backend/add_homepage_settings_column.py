import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def migrate():
    # Using the connection string from .env
    engine = create_async_engine('postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas')
    async with engine.begin() as conn:
        print("Adding 'homepage_settings' column to 'agents' table...")
        
        # Add column if it doesn't exist
        await conn.execute(text("""
            ALTER TABLE agents 
            ADD COLUMN IF NOT EXISTS homepage_settings JSON;
        """))
        
        print("Column added successfully.")

    await engine.dispose()
    print("\nMigration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
