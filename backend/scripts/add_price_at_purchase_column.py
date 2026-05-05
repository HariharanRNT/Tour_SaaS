import asyncio
from sqlalchemy import text
from app.database import engine

async def add_column():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS price_at_purchase NUMERIC(10, 2)"))
            # Also populate existing subscriptions with their current plan price
            await conn.execute(text("""
                UPDATE subscriptions s
                SET price_at_purchase = p.price
                FROM subscription_plans p
                WHERE s.plan_id = p.id AND s.price_at_purchase IS NULL
            """))
            print("Successfully added price_at_purchase column to subscriptions table.")
        except Exception as e:
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    asyncio.run(add_column())
