import asyncio
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings'"))
        cols = [row[0] for row in result.fetchall()]
        print(f"Columns: {cols}")
        
        required = [
            'gst_percentage', 'gst_amount', 'is_gst_inclusive', 'base_amount',
            'cancellation_enabled', 'cancellation_rules'
        ]
        
        missing = [c for c in required if c not in cols]
        if missing:
            print(f"Missing: {missing}")
            for c in missing:
                if c == 'is_gst_inclusive' or c == 'cancellation_enabled':
                    await conn.execute(text(f"ALTER TABLE bookings ADD COLUMN {c} BOOLEAN"))
                elif c == 'cancellation_rules':
                    await conn.execute(text(f"ALTER TABLE bookings ADD COLUMN {c} JSON"))
                else:
                    await conn.execute(text(f"ALTER TABLE bookings ADD COLUMN {c} NUMERIC(12, 2)"))
            await conn.commit()
            print("Fixed missing columns.")
        else:
            print("All required columns exist.")

if __name__ == "__main__":
    asyncio.run(check())
