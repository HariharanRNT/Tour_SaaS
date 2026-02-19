import asyncio
import sys
sys.path.insert(0, 'd:\\Hariharan\\G-Project\\RNT_Tour\\backend')

async def run_migration():
    from app.database import engine
    from sqlalchemy import text
    
    try:
        async with engine.begin() as conn:
            print("Adding razorpay_subscription_id column...")
            await conn.execute(text("""
                ALTER TABLE subscriptions 
                ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255)
            """))
            
            print("Creating unique index...")
            await conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_razorpay_subscription_id 
                ON subscriptions(razorpay_subscription_id)
            """))
            
            print("Adding razorpay_payment_id column...")
            await conn.execute(text("""
                ALTER TABLE subscriptions 
                ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255)
            """))
            
            print("Migration completed successfully!")
            
            # Verify the migration
            print("\nVerifying columns...")
            result = await conn.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'subscriptions'
                AND column_name IN ('razorpay_subscription_id', 'razorpay_payment_id')
                ORDER BY column_name
            """))
            columns = result.fetchall()
            
            print("Added columns:")
            for col in columns:
                print(f"  - {col[0]} ({col[1]}) - Nullable: {col[2]}")
                
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_migration())
