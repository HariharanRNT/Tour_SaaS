import asyncio
from app.database import AsyncSessionLocal
from app.models import Agent, AgentSMTPSettings
from app.utils.crypto import decrypt_value
from app.services.email_service import EmailService
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        agent_result = await db.execute(select(Agent).where(Agent.user_id == '87f499f5-01f0-4499-b9c1-142e387d8994'))
        agent = agent_result.scalar_one_or_none()
        if agent:
            smtp_res = await db.execute(select(AgentSMTPSettings).where(AgentSMTPSettings.agent_id == agent.id))
            smtp = smtp_res.scalar_one_or_none()
            if smtp:
                pwd = decrypt_value(smtp.password) if smtp.password else ''
                smtp_config = {
                    'host': smtp.host,
                    'port': smtp.port,
                    'user': smtp.username,
                    'password': pwd,
                    'from_email': smtp.from_email,
                    'from_name': smtp.from_name,
                    'encryption_type': smtp.encryption_type,
                }
                print(f'Sending DIRECT SMTP test to: hariharan@reshandthosh.com')
                print(f'Using SMTP: {smtp.host}:{smtp.port} from {smtp.from_email}')
                result = await EmailService.send_email(
                    to_email='hariharan@reshandthosh.com',
                    subject='DIRECT SMTP TEST - Enquiry Notification Debug',
                    body='<h2>This is a direct SMTP test for enquiry notification delivery.</h2><p>If you receive this, the SMTP delivery is working.</p>',
                    smtp_config=smtp_config,
                    raise_errors=True
                )
                print(f'Result: {result}')

asyncio.run(main())
