import asyncio
from app.database import AsyncSessionLocal
from app.models import Agent, AgentSMTPSettings, User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # abc.local agent id = 87f499f5
        result = await db.execute(
            select(Agent, AgentSMTPSettings)
            .outerjoin(AgentSMTPSettings, Agent.id == AgentSMTPSettings.agent_id)
            .where(Agent.user_id == '87f499f5-01f0-4499-b9c1-142e387d8994')
        )
        row = result.first()
        if row:
            agent, smtp = row
            print(f"Agent: {agent.first_name} {agent.last_name}")
            print(f"Agent user_id: {agent.user_id}")
            print(f"SMTP Settings: {smtp}")
            if smtp:
                print(f"  host: {smtp.host}")
                print(f"  port: {smtp.port}")
                print(f"  username: {smtp.username}")
                print(f"  from_email: {smtp.from_email}")
                print(f"  encryption: {smtp.encryption_type}")
            else:
                print("  NO SMTP SETTINGS CONFIGURED")

asyncio.run(main())
