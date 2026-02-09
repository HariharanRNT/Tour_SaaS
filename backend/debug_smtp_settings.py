import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal, engine
from app.models import Agent, User, UserRole
from app.utils.crypto import decrypt_value

async def debug_smtp():
    async with AsyncSessionLocal() as db:
        # Find all agents with SMTP settings
        stmt = select(Agent).options(selectinload(Agent.smtp_settings), selectinload(Agent.user))
        result = await db.execute(stmt)
        agents = result.scalars().all()
        
        print(f"Found {len(agents)} agents.")
        for agent in agents:
            print(f"\nAgent: {agent.first_name} {agent.last_name} ({agent.user.email})")
            if agent.smtp_settings:
                s = agent.smtp_settings
                print(f"  SMTP Host: {s.host}")
                print(f"  SMTP Port: {s.port}")
                print(f"  SMTP User: {s.username}")
                print(f"  SMTP Encryption: {s.encryption_type}")
                try:
                    decrypted_pass = decrypt_value(s.password)
                    print(f"  Password Decrypted: {'Yes' if decrypted_pass else 'No'}")
                    # Don't print the actual password for security, but check if it looks like a plain text password or remains encrypted
                    if decrypted_pass.startswith('plain:'):
                        print("  Warning: Password seems to be stored as 'plain:...'")
                except Exception as e:
                    print(f"  Error decrypting password: {e}")
            else:
                print("  No SMTP settings configured.")

if __name__ == "__main__":
    asyncio.run(debug_smtp())
