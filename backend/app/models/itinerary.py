"""Database models for itinerary planning"""
from sqlalchemy import Column, String, JSON, DateTime, Float, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timedelta
import uuid
from app.database import Base


class ItineraryCart(Base):
    """
    Cart-level storage for itineraries
    
    Stores the entire itinerary as JSON for flexibility
    Allows users to save, modify, and retrieve itineraries before booking
    """
    __tablename__ = "itinerary_carts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Trip details
    destination = Column(String(255), nullable=False)
    start_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    end_date = Column(String(10), nullable=False)
    total_days = Column(Integer, nullable=False)
    
    # Itinerary data stored as JSON
    # Structure:
    # {
    #   "itinerary_id": "uuid",
    #   "days": [
    #     {
    #       "day_number": 1,
    #       "date": "2026-03-15",
    #       "slots": [
    #         {
    #           "time_slot": "MORNING",
    #           "activity": {...}  # Full NormalizedActivity object
    #         }
    #       ],
    #       "total_activities": 1,
    #       "is_full": false
    #     }
    #   ],
    #   "unassigned_activities": [...]
    # }
    itinerary_data = Column(JSON, nullable=False)
    
    # Pricing
    total_price = Column(Float, nullable=False, default=0.0)
    currency = Column(String(3), nullable=False, default="USD")
    
    # Cart management
    status = Column(String(20), default="active")  # active, expired, converted, cancelled
    expires_at = Column(DateTime, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Validation snapshot (stores last validation results)
    last_validated_at = Column(DateTime)
    validation_result = Column(JSON)  # Stores price changes, availability issues
    
    # User preferences (optional)
    preferences = Column(JSON)  # Stores user preferences like categories, intensity level
    
    def __repr__(self):
        return f"<ItineraryCart(id={self.id}, user_id={self.user_id}, destination={self.destination}, status={self.status})>"
    
    @property
    def is_expired(self) -> bool:
        """Check if cart has expired"""
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_active(self) -> bool:
        """Check if cart is active and not expired"""
        return self.status == "active" and not self.is_expired
    
    @staticmethod
    def create_expiry_time(hours: int = 24) -> datetime:
        """Create expiry timestamp (default 24 hours from now)"""
        return datetime.utcnow() + timedelta(hours=hours)
