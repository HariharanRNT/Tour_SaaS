import asyncio
from sqlalchemy import text
from app.database import engine

async def run_migration():
    print("Starting migration: Removing UNIQUE constraint from domain column...")
    
    async with engine.begin() as conn:
        # PostgreSQL specific
        try:
            print("Dropping index ix_users_domain if exists...")
            await conn.execute(text("DROP INDEX IF EXISTS ix_users_domain"))
            
            # Recreate index without UNIQUE
            print("Creating normal index on domain...")
            await conn.execute(text("CREATE INDEX ix_users_domain ON users (domain)"))
            
            # Also check if there's a unique constraint explicitly named (unlikely if created via simple column def in previous simplified migration, but good to check)
            # Usually SQLAlchemy creates an index for unique=True.
            
            print("Migration completed successfully.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
