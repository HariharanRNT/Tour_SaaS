import enum
import uuid
from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean, ForeignKey, Enum as SQLEnum, JSON, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class EmailStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SENT = "SENT"
    FAILED = "FAILED"
    RETRY = "RETRY"
    SCHEDULED = "SCHEDULED"
    EXPIRED = "EXPIRED"

class SenderType(str, enum.Enum):
    ADMIN = "ADMIN"
    AGENT = "AGENT"
    SYSTEM = "SYSTEM"

class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    celery_task_id = Column(String, nullable=True, index=True)
    queue_name = Column(String, nullable=True)
    
    # Priority: 0 (Low) to 10 (Highest)
    priority = Column(Integer, default=0, nullable=False)
    
    sender_type = Column(SQLEnum(SenderType, native_enum=False), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    scheduled_by = Column(UUID(as_uuid=True), nullable=True)
    
    email_type = Column(String, nullable=False, index=True)
    recipient_email = Column(String, nullable=False, index=True)
    subject = Column(String, nullable=False)
    
    template_name = Column(String, nullable=True)
    template_context = Column(JSON, nullable=True)
    html_body = Column(Text, nullable=True)
    
    status = Column(SQLEnum(EmailStatus, native_enum=False), default=EmailStatus.PENDING, nullable=False, index=True)
    
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    
    error_message = Column(Text, nullable=True)
    email_provider_response = Column(Text, nullable=True)
    metadata_info = Column(JSON, nullable=True)
    
    scheduled_time = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    sent_time = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    is_deleted = Column(Boolean, default=False, index=True)
    attachment_urls = Column(JSON, nullable=True)

    __table_args__ = (
        CheckConstraint('priority >= 0 AND priority <= 10', name='ck_email_priority'),
    )
