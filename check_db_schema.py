import asyncio
import sys
sys.path.insert(0, 'd:\\Hariharan\\G-Project\\RNT_Tour\\backend')

async def check_db_columns():
    from app.database import engine
    from sqlalchemy import text
    
    try:
        async with engine.begin() as conn:
            # Check if subscriptions table exists
            query = text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'subscriptions'
                ORDER BY ordinal_position;
            """)
            result = await conn.execute(query)
            columns = result.fetchall()
            
            print("Subscriptions table columns:")
            for col in columns:
                print(f"  - {col[0]} ({col[1]})")
            
            # Check specifically for razorpay_subscription_id
            has_rzp_sub_id = any(col[0] == 'razorpay_subscription_id' for col in columns)
            print(f"\nrazorpay_subscription_id exists: {has_rzp_sub_id}")
            
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(check_db_columns())
