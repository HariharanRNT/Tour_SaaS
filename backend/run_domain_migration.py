import asyncio
from sqlalchemy import text
from app.database import engine

async def run_migration():
    print("Starting migration: Adding domain column to users table...")
    
    async with engine.begin() as conn:
        # Check if column exists
        result = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='domain'"
        ))
        if result.fetchone():
            print("Column 'domain' already exists.")
        else:
            print("Adding 'domain' column...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN domain VARCHAR"))
            await conn.execute(text("CREATE UNIQUE INDEX ix_users_domain ON users (domain) WHERE domain IS NOT NULL"))
            print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(run_migration())
