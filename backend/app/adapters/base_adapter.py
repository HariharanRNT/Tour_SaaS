"""Base adapter interface for activity normalization"""
from abc import ABC, abstractmethod
from typing import Dict, Any
from app.schemas.itinerary_schemas import NormalizedActivity
from app.schemas.enums import ActivityType, TimeSlot


class BaseActivityAdapter(ABC):
    """Abstract base class for all activity adapters"""
    
    @abstractmethod
    def normalize(self, raw_activity: Dict[str, Any]) -> NormalizedActivity:
        """
        Convert supplier-specific activity format to internal schema
        
        Args:
            raw_activity: Raw activity data from supplier API
            
        Returns:
            NormalizedActivity in internal format
        """
        pass
    
    @abstractmethod
    def classify_activity_type(self, duration: str) -> ActivityType:
        """
        Determine if activity is FULL_DAY, HALF_DAY, or SHORT
        
        Args:
            duration: Duration string from supplier (e.g., "3 hours", "1 day")
            
        Returns:
            ActivityType enum value
        """
        pass
    
    @abstractmethod
    def determine_time_slot(self, activity: Dict[str, Any]) -> TimeSlot:
        """
        Infer preferred time slot from activity data
        
        Args:
            activity: Raw activity data
            
        Returns:
            TimeSlot enum value
        """
        pass
