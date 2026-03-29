import logging
from typing import List, Optional, Dict, Any
from app.models import User, Agent, UserRole
from app.tasks.email_tasks import send_email_task
from app.database import AsyncSessionLocal
from app.utils.agent_email_templates import (
    get_agent_registration_pending_template,
    get_admin_new_registration_request_template,
    get_agent_approved_template,
    get_agent_rejected_template
)

logger = logging.getLogger(__name__)

class AgentNotificationService:
    @staticmethod
    async def _send_agent_notification(
        to_email: str,
        subject: str,
        html_body: str,
        type: str
    ):
        """Internal helper to enqueue agent notifications"""
        from app.models import NotificationLog
        log_id_str = None
        
        logger.info(f"Preparing to send {type} notification to {to_email}")
        
        try:
            # Log the notification attempt
            async with AsyncSessionLocal() as session:
                log_entry = NotificationLog(
                    type=f"agent_{type}",
                    status="pending"
                )
                session.add(log_entry)
                await session.commit()
                await session.refresh(log_entry)
                log_id_str = str(log_entry.id)
                logger.debug(f"Created NotificationLog entry {log_id_str} for {type}")
        except Exception as e:
            logger.error(f"Failed to create NotificationLog for {type} to {to_email}: {e}")

        try:
            # Explicitly use keyword arguments for Celery task to avoid any positional mismatch
            send_email_task.delay(
                to_email=to_email,
                subject=subject,
                html_body=html_body,
                smtp_config=None, # System default SMTP for agent-level notifications
                notification_log_id=log_id_str
            )
            logger.info(f"Enqueued {type} notification task for {to_email} (LogID: {log_id_str})")
        except Exception as e:
            logger.error(f"Failed to enqueue {type} notification task for {to_email}: {e}")

    @staticmethod
    async def send_registration_received_email(agent_user: User):
        """Sends 'Registration Received' email to the agent"""
        if not agent_user or not agent_user.email:
            logger.warning("Cannot send registration received email: No user or email provided")
            return
            
        # Ensure we have a name, fallback to email if necessary
        first_name = agent_user.first_name or ""
        last_name = agent_user.last_name or ""
        agent_name = f"{first_name} {last_name}".strip() or "Agent"
        
        logger.info(f"Triggering registration received email for {agent_user.email}")
        
        data = {
            "agent_name": agent_name
        }
        subject = "Registration Received – Awaiting Approval"
        html_body = get_agent_registration_pending_template(data)
        
        await AgentNotificationService._send_agent_notification(
            agent_user.email, subject, html_body, "registration_received"
        )

    @staticmethod
    async def send_admin_registration_request_email(agent_user: User, admin_users: List[User]):
        """Sends 'New Agent Registration Request' email to all admins"""
        if not agent_user:
            return
            
        first_name = agent_user.first_name or ""
        last_name = agent_user.last_name or ""
        agent_name = f"{first_name} {last_name}".strip() or "New Agent"
        agency_name = agent_user.agency_name or "N/A"
        
        logger.info(f"Triggering admin registration alert for new agent: {agent_user.email}")
        
        data = {
            "agent_name": agent_name,
            "agency_name": agency_name,
            "email": agent_user.email
        }
        subject = "New Agent Registration Request"
        html_body = get_admin_new_registration_request_template(data)
        
        if not admin_users:
            logger.warning("No admin users found to receive registration request email")
            return
            
        for admin in admin_users:
            if admin.email:
                await AgentNotificationService._send_agent_notification(
                    admin.email, subject, html_body, "admin_request"
                )

    @staticmethod
    async def send_approval_email(agent_user: User):
        """Sends 'Registration Approved' email to the agent"""
        if not agent_user or not agent_user.email:
            return
            
        first_name = agent_user.first_name or ""
        last_name = agent_user.last_name or ""
        agent_name = f"{first_name} {last_name}".strip() or "Agent"
        
        logger.info(f"Triggering approval email for {agent_user.email}")
            
        data = {
            "agent_name": agent_name
        }
        subject = "Registration Approved"
        html_body = get_agent_approved_template(data)
        
        await AgentNotificationService._send_agent_notification(
            agent_user.email, subject, html_body, "approved"
        )

    @staticmethod
    async def send_rejection_email(agent_user: User):
        """Sends 'Registration Declined' email to the agent"""
        if not agent_user or not agent_user.email:
            return
            
        first_name = agent_user.first_name or ""
        last_name = agent_user.last_name or ""
        agent_name = f"{first_name} {last_name}".strip() or "Agent"
        
        logger.info(f"Triggering rejection email for {agent_user.email}")
            
        data = {
            "agent_name": agent_name
        }
        subject = "Registration Declined"
        html_body = get_agent_rejected_template(data)
        
        await AgentNotificationService._send_agent_notification(
            agent_user.email, subject, html_body, "declined"
        )

