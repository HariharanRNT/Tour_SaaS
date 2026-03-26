import asyncio
import sys
import os
from sqlalchemy import text
from passlib.context import CryptContext

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models import User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def update_admin_password():
    async with AsyncSessionLocal() as db:
        hashed_password = pwd_context.hash("admin123")
        # Check if user exists
        result = await db.execute(text("SELECT id FROM users WHERE email = 'admin@globaltours.com'"))
        user_id = result.scalar()
        
        if user_id:
            await db.execute(text(f"UPDATE users SET hashed_password = '{hashed_password}' WHERE id = '{user_id}'"))
            await db.commit()
            print("ADMIN_PASSWORD_UPDATED: admin123")
        else:
            print("ADMIN_NOT_FOUND")

if __name__ == "__main__":
    asyncio.run(update_admin_password())
