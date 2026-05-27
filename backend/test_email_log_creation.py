import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import Enquiry, User, Agent
from app.services.email_log_service import EmailLogService
from app.models.email_log import SenderType
from app.api.v1.enquiries import _build_enquiry_email_html

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Enquiry).where(Enquiry.id == 'e4e23421-a2a3-4882-912b-762703cf7286'))
        enquiry = result.scalar_one_or_none()
        
        if not enquiry:
            print("Enquiry not found")
            return
            
        print(f"Enquiry found: {enquiry.id}")
        print(f"Customer Name: {enquiry.customer_name}")
        print(f"Message: {repr(enquiry.message)}")
        
        agent_user_result = await db.execute(select(User).where(User.id == enquiry.agent_id))
        agent_user = agent_user_result.scalar_one_or_none()
        
        agent_profile_result = await db.execute(select(Agent).where(Agent.user_id == enquiry.agent_id))
        agent_profile = agent_profile_result.scalar_one_or_none()
        
        print(f"Agent User Email: {agent_user.email if agent_user else 'None'}")
        
        if agent_user and agent_user.email:
            agent_name = f"{agent_profile.first_name} {agent_profile.last_name}" if agent_profile else "Agent"
            package_title = "General Enquiry"
            
            try:
                html_body = _build_enquiry_email_html(
                    agent_name=agent_name,
                    customer_name=enquiry.customer_name,
                    package_title=package_title,
                    travel_date=enquiry.travel_date,
                    travellers=enquiry.travellers,
                    email=enquiry.email,
                    phone=enquiry.phone,
                    message=enquiry.message,
                    enquiry_id=str(enquiry.id)
                )
                print("HTML body built successfully")
                
                email_log = await EmailLogService.create_log(
                    session=db,
                    sender_type=SenderType.SYSTEM,
                    sender_id=None,
                    email_type="agent_enquiry_notification",
                    recipient_email=agent_user.email,
                    subject=f"New Enquiry for {package_title}",
                    html_body=html_body,
                    metadata_info={"enquiry_id": str(enquiry.id)}
                )
                print(f"Email log created: {email_log.id}")
            except Exception as e:
                print(f"Exception during email log creation: {e}")

asyncio.run(main())
