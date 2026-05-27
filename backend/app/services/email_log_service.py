from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, or_, desc
import uuid
from datetime import datetime, timezone

from app.models.email_log import EmailLog, EmailStatus, SenderType
from app.database import AsyncSessionLocal

class EmailLogService:
    @staticmethod
    async def create_log(
        session: AsyncSession,
        sender_type: SenderType,
        email_type: str,
        recipient_email: str,
        subject: str,
        sender_id: Optional[uuid.UUID] = None,
        scheduled_by: Optional[uuid.UUID] = None,
        queue_name: Optional[str] = None,
        priority: int = 0,
        template_name: Optional[str] = None,
        template_context: Optional[Dict[str, Any]] = None,
        html_body: Optional[str] = None,
        metadata_info: Optional[Dict[str, Any]] = None,
        expires_at: Optional[datetime] = None,
        attachment_urls: Optional[list] = None
    ) -> EmailLog:
        """
        Creates a new PENDING email log entry.
        """
        email_log = EmailLog(
            sender_type=sender_type,
            sender_id=sender_id,
            scheduled_by=scheduled_by,
            email_type=email_type,
            recipient_email=recipient_email,
            subject=subject,
            queue_name=queue_name,
            priority=priority,
            template_name=template_name,
            template_context=template_context,
            html_body=html_body,
            metadata_info=metadata_info,
            expires_at=expires_at,
            attachment_urls=attachment_urls,
            status=EmailStatus.PENDING,
            retry_count=0
        )
        session.add(email_log)
        await session.commit()
        await session.refresh(email_log)
        return email_log

    @staticmethod
    async def get_stats(
        sender_type: Optional[SenderType] = None, 
        sender_id: Optional[uuid.UUID] = None,
        agent_email: Optional[str] = None
    ) -> Dict[str, Any]:
        async with AsyncSessionLocal() as session:
            # Metrics
            base_query = select(EmailLog).where(EmailLog.is_deleted == False)
            
            if agent_email and sender_id:
                # Show emails sent BY the agent OR sent BY the system TO the agent
                base_query = base_query.where(
                    or_(
                        and_(EmailLog.sender_type == SenderType.AGENT, EmailLog.sender_id == sender_id),
                        and_(EmailLog.sender_type == SenderType.SYSTEM, EmailLog.recipient_email == agent_email)
                    )
                )
            elif sender_type:
                base_query = base_query.where(EmailLog.sender_type == sender_type)
            elif sender_id:
                base_query = base_query.where(EmailLog.sender_id == sender_id)

            total = await session.scalar(select(func.count()).select_from(base_query.subquery()))
            sent = await session.scalar(select(func.count()).select_from(base_query.where(EmailLog.status == EmailStatus.SENT).subquery()))
            pending = await session.scalar(select(func.count()).select_from(base_query.where(EmailLog.status == EmailStatus.PENDING).subquery()))
            failed = await session.scalar(select(func.count()).select_from(base_query.where(EmailLog.status == EmailStatus.FAILED).subquery()))
            expired = await session.scalar(select(func.count()).select_from(base_query.where(EmailLog.status == EmailStatus.EXPIRED).subquery()))
            
            return {
                "total": total or 0,
                "sent": sent or 0,
                "pending": pending or 0,
                "failed": failed or 0,
                "expired": expired or 0
            }

    @staticmethod
    async def get_logs(
        page: int = 1,
        limit: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
        sender_type: Optional[SenderType] = None,
        sender_id: Optional[uuid.UUID] = None,
        agent_email: Optional[str] = None
    ) -> Tuple[List[EmailLog], int]:
        async with AsyncSessionLocal() as session:
            query = select(EmailLog).where(EmailLog.is_deleted == False)
            
            if agent_email and sender_id:
                query = query.where(
                    or_(
                        and_(EmailLog.sender_type == SenderType.AGENT, EmailLog.sender_id == sender_id),
                        and_(EmailLog.sender_type == SenderType.SYSTEM, EmailLog.recipient_email == agent_email)
                    )
                )
            else:
                if sender_type:
                    query = query.where(EmailLog.sender_type == sender_type)
                if sender_id:
                    query = query.where(EmailLog.sender_id == sender_id)
                
            if status:
                query = query.where(EmailLog.status == status)
                
            if search:
                query = query.where(
                    or_(
                        EmailLog.recipient_email.ilike(f"%{search}%"),
                        EmailLog.subject.ilike(f"%{search}%")
                    )
                )
                
            # Total count
            total_query = select(func.count()).select_from(query.subquery())
            total = await session.scalar(total_query)
            
            # Pagination & Ordering
            query = query.order_by(desc(EmailLog.created_at)).offset((page - 1) * limit).limit(limit)
            result = await session.execute(query)
            logs = result.scalars().all()
            
            return list(logs), total or 0

    @staticmethod
    async def get_log_by_id(log_id: uuid.UUID) -> Optional[EmailLog]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(EmailLog).where(EmailLog.id == log_id, EmailLog.is_deleted == False))
            return result.scalar_one_or_none()

    @staticmethod
    async def update_log_status(
        log_id: uuid.UUID,
        status: EmailStatus,
        error_message: Optional[str] = None,
        provider_response: Optional[str] = None
    ):
        async with AsyncSessionLocal() as session:
            updates = {"status": status}
            
            if status == EmailStatus.PROCESSING:
                updates["processing_started_at"] = datetime.now(timezone.utc)
            elif status == EmailStatus.SENT:
                updates["sent_time"] = datetime.now(timezone.utc)
                
            if error_message:
                updates["error_message"] = error_message
            if provider_response:
                updates["email_provider_response"] = provider_response
                
            stmt = update(EmailLog).where(EmailLog.id == log_id).values(**updates)
            await session.execute(stmt)
            await session.commit()
