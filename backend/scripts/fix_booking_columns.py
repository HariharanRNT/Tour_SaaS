import asyncio
import os
from sqlalchemy import text
from app.database import engine

async def check_columns():
    async with engine.connect() as conn:
        try:
            result = await conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'bookings' 
                AND column_name IN ('cancellation_enabled', 'cancellation_rules')
            """))
            columns = [row[0] for row in result.fetchall()]
            print(f"Found columns: {columns}")
            
            if 'cancellation_enabled' not in columns or 'cancellation_rules' not in columns:
                print("Missing columns detected. Attempting to add them...")
                if 'cancellation_enabled' not in columns:
                    await conn.execute(text("ALTER TABLE bookings ADD COLUMN cancellation_enabled BOOLEAN DEFAULT FALSE"))
                if 'cancellation_rules' not in columns:
                    await conn.execute(text("ALTER TABLE bookings ADD COLUMN cancellation_rules JSON DEFAULT '[]'::json"))
                await conn.commit()
                print("Columns added successfully.")
            else:
                print("All columns already exist.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_columns())
