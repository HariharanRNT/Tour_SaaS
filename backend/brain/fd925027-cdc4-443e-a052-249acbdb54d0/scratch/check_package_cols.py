
import asyncio
from sqlalchemy import text
from app.database import engine

async def check_db():
    try:
        async with engine.connect() as conn:
            # Check for inclusions/exclusions columns in packages table
            res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'packages'"))
            columns = [row[0] for row in res.fetchall()]
            print(f"Columns in packages: {columns}")
            
            check_cols = ['inclusions', 'exclusions']
            missing_cols = [col for col in check_cols if col not in columns]
            
            if missing_cols:
                print(f"MISSING COLUMNS: {missing_cols}")
            else:
                print("All target columns exist.")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
