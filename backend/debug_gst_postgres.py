import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Database URL from .env
DATABASE_URL = "postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas"

async def check_gst_settings():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print(f"--- Agent GST Settings in PostgreSQL ---")
        try:
            # Query agents joined with users to get email
            query = text("""
            SELECT u.email, a.id, a.gst_inclusive, a.gst_percentage
            FROM agents a
            JOIN users u ON a.user_id = u.id
            """)
            
            result = await session.execute(query)
            rows = result.fetchall()
            
            if not rows:
                print("No agents found.")
            
            for row in rows:
                email, agent_id, inclusive, percentage = row
                status = "Inclusive" if inclusive else "Exclusive"
                print(f"Agent: {email} | ID: {agent_id} | GST: {status} ({percentage}%) | Raw Inclusive: {inclusive}")
                
        except Exception as e:
            print(f"Query failed: {e}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_gst_settings())
