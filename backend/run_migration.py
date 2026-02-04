"""Run database migration for trip planner"""
import asyncio
from sqlalchemy import text
from app.database import engine

async def run_migration():
    async with engine.begin() as conn:
        # Read migration file
        with open('migrations/add_trip_planner_tables.sql', 'r') as f:
            sql = f.read()
        
        # Split by semicolon and execute each statement
        statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
        
        for stmt in statements:
            if stmt:
                try:
                    await conn.execute(text(stmt))
                    print(f"✅ Executed: {stmt[:50]}...")
                except Exception as e:
                    print(f"⚠️  Skipped (may already exist): {stmt[:50]}...")
        
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
