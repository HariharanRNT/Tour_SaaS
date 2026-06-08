import asyncio
from app.database import AsyncSessionLocal
from app.models import Enquiry, Agent, User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # Check the two failing enquiries
        for eid in ['68dfbf04-ed1e-4b6d-bfa2-f36d3182374f', '428505c8-8c7f-4089-a8b5-f23aaaae3461']:
            result = await db.execute(select(Enquiry).where(Enquiry.id == eid))
            e = result.scalar_one_or_none()
            if e:
                agent_result = await db.execute(select(Agent, User).join(User, Agent.user_id == User.id).where(Agent.user_id == e.agent_id))
                agent_row = agent_result.first()
                print(f"Enquiry: {e.id}")
                print(f"  package_id: {e.package_id}")
                print(f"  message: {e.message}")
                print(f"  agent_id: {e.agent_id}, domain: {agent_row[0].domain if agent_row else 'N/A'}, email: {agent_row[1].email if agent_row else 'N/A'}")

asyncio.run(main())
