import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def main():
    engine = create_async_engine('postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas')
    hashed_password = pwd_context.hash("Password@123")
    
    async with engine.connect() as conn:
        # Reset password
        await conn.execute(text("UPDATE users SET password_hash = :hash WHERE email = 'agent1@toursaas.com'"), {"hash": hashed_password})
        await conn.commit()
        print("Password reset for agent1@toursaas.com")
        
        # Ensure it is approved and active
        await conn.execute(text("UPDATE users SET is_active = True, approval_status = 'APPROVED' WHERE email = 'agent1@toursaas.com'"))
        await conn.commit()
        print("Agent status set to Approved and Active")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
