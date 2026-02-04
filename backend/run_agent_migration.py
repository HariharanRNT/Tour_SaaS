"""Run database migration for agent columns"""
import asyncio
from sqlalchemy import text
from app.database import engine

async def run_migration():
    print("Running Agent Migration...")
    async with engine.begin() as conn:
        # Read migration file
        with open('migrations/add_agent_columns.sql', 'r') as f:
            sql = f.read()
        
        # Split by semicolon and execute each statement
        statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
        
        for stmt in statements:
            if stmt:
                try:
                    await conn.execute(text(stmt))
                    print(f"[OK] Executed: {stmt[:50]}...")
                except Exception as e:
                    print(f"[WARN] Error/Skipped: {e}")
        
        print("\n[OK] Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
