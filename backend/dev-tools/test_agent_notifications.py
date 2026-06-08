import asyncio
import logging
import uuid
import sys
import os
from sqlalchemy import select
from sqlalchemy.orm import selectinload

# Add parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from app.models import User, UserRole, Agent, ApprovalStatus
from app.services.agent_notification_service import AgentNotificationService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_diagnostic():
    logger.info("Starting Agent Notification Diagnostic...")
    
    async with AsyncSessionLocal() as session:
        # 1. Find or create a test agent user
        stmt = select(User).where(User.role == UserRole.AGENT).options(
            selectinload(User.agent_profile)
        ).limit(1)
        result = await session.execute(stmt)
        test_agent = result.scalar_one_or_none()
        
        if not test_agent:
            logger.error("No agent user found in DB. Please create one manually or run a registration test.")
            return

        logger.info(f"Using test agent: {test_agent.email} (Name: {test_agent.first_name} {test_agent.last_name})")
        
        # 2. Find admin users
        stmt = select(User).where(User.role == UserRole.ADMIN)
        result = await session.execute(stmt)
        admins = result.scalars().all()
        logger.info(f"Found {len(admins)} admin(s)")

        # 3. Test: Registration Received (to Agent)
        logger.info("Testing: send_registration_received_email")
        await AgentNotificationService.send_registration_received_email(test_agent)
        
        # 4. Test: Admin Registration Request (to Admins)
        logger.info("Testing: send_admin_registration_request_email")
        await AgentNotificationService.send_admin_registration_request_email(test_agent, admins)
        
        # 5. Test: Approval Email (to Agent)
        logger.info("Testing: send_approval_email")
        await AgentNotificationService.send_approval_email(test_agent)
        
        # 6. Test: Rejection Email (to Agent)
        logger.info("Testing: send_rejection_email")
        await AgentNotificationService.send_rejection_email(test_agent)

    logger.info("Diagnostic triggers completed. Please check the NotificationLog table and Celery worker logs for results.")

if __name__ == "__main__":
    asyncio.run(run_diagnostic())
