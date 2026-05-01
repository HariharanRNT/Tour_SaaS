import asyncio
from sqlalchemy import text
from app.database import engine

async def inspect_schema():
    async with engine.connect() as conn:
        result = await conn.execute(text("""
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'users'::regclass AND contype = 'u'
        """))
        print("Constraints on 'users':")
        for row in result:
            print(row[0])
            
        result = await conn.execute(text("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'users'
        """))
        print("\nIndexes on 'users':")
        for row in result:
            print(row[0])

if __name__ == "__main__":
    asyncio.run(inspect_schema())
