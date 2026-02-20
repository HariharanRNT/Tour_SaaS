import asyncio
from app.database import AsyncSessionLocal
from app.models import User, Admin, UserRole
from app.core.security import get_password_hash

async def recreate_admin():
    async with AsyncSessionLocal() as session:
        # Admin credentials from your request
        email = "admin@globaltours.com"
        password = "adminpassword123"
        
        print(f"Creating Admin user: {email}...")
        
        # Create User
        user = User(
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.ADMIN,
            email_verified=True,
            is_active=True
        )
        session.add(user)
        await session.flush() # Get user ID
        
        # Create Admin Profile
        admin = Admin(
            user_id=user.id,
            first_name="Global",
            last_name="Admin"
        )
        session.add(admin)
        
        await session.commit()
        print(f"Successfully created Admin user {email} and linked Admin profile.")

if __name__ == "__main__":
    asyncio.run(recreate_admin())
