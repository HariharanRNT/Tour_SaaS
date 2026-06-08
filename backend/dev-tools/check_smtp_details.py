import asyncio
from app.database import AsyncSessionLocal
from app.models import Agent, AgentSMTPSettings
from app.utils.crypto import decrypt_value
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # abc.local agent
        agent_result = await db.execute(select(Agent).where(Agent.user_id == '87f499f5-01f0-4499-b9c1-142e387d8994'))
        agent = agent_result.scalar_one_or_none()
        if agent:
            smtp_res = await db.execute(select(AgentSMTPSettings).where(AgentSMTPSettings.agent_id == agent.id))
            smtp = smtp_res.scalar_one_or_none()
            if smtp:
                pwd = decrypt_value(smtp.password) if smtp.password else None
                print(f"SMTP host: {smtp.host}")
                print(f"SMTP port: {smtp.port}")
                print(f"SMTP user: {smtp.username}")
                print(f"SMTP from_email: {smtp.from_email}")
                print(f"SMTP from_name: {smtp.from_name}")
                print(f"SMTP password set: {bool(pwd)}")
                print(f"SMTP password length: {len(pwd) if pwd else 0}")

asyncio.run(main())
