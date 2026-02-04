import asyncio
from uuid import uuid4
from app.database import AsyncSessionLocal
from app.models import User, UserRole, Admin
from app.core.security import get_password_hash
from sqlalchemy import select

async def create_admin():
    email = "admin@globaltours.com"
    password = "adminpassword123"
    
    print(f"Creating Admin User: {email}")
    
    async with AsyncSessionLocal() as session:
        # Check if exists
        result = await session.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            print("Admin user already exists.")
            return

        # Create User
        user_id = uuid4()
        user = User(
            id=user_id,
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True
        )
        session.add(user)
        
        # Create Admin Profile
        admin_profile = Admin(
            id=uuid4(),
            user_id=user_id,
            first_name="System",
            last_name="Admin"
        )
        session.add(admin_profile)
        
        await session.commit()
        print(f"Admin created successfully.\nEmail: {email}\nPassword: {password}")

if __name__ == "__main__":
    asyncio.run(create_admin())
