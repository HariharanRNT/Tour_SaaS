"""
Pydantic schemas for AI Assistant functionality
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class ChatMessage(BaseModel):
    """Single chat message"""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)


class ChatRequest(BaseModel):
    """Request to send a chat message"""
    message: str = Field(..., min_length=1, max_length=2000, description="User's message")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for context")
    mode: Optional[str] = Field("general", description="Chat mode: 'general' or 'package_search'")


class ChatResponse(BaseModel):
    """Response from chat"""
    success: bool
    message: str
    conversation_id: str
    error: Optional[str] = None
    tool_used: Optional[str] = None
    tool_result: Optional[Any] = None


class PackageGenerationRequest(BaseModel):
    """Request to generate a package from conversation"""
    conversation_id: str = Field(..., description="ID of the conversation")
    conversation_summary: Optional[str] = Field(None, description="Summary of requirements")


class ActivitySchema(BaseModel):
    """Activity within a day"""
    timeSlot: str
    startTime: str
    endTime: str
    title: str
    description: str
    location: str
    duration: str
    included: bool
    estimatedCost: float
    category: str
    imageUrls: List[str] = []  # Unsplash image URLs


class DayItinerarySchema(BaseModel):
    """Single day itinerary"""
    day: int
    title: str
    activities: List[ActivitySchema]


class DurationSchema(BaseModel):
    """Package duration"""
    days: int
    nights: int


class GeneratedPackageSchema(BaseModel):
    """Complete generated package structure"""
    packageTitle: str
    packageOverview: str
    destination: str
    country: str
    duration: DurationSchema
    pricePerPerson: float
    currency: str = "INR"
    category: List[str]
    maxGroupSize: int
    highlights: List[str]
    inclusions: List[str]
    exclusions: List[str]
    itinerary: List[DayItinerarySchema]
    bestTimeToVisit: str
    importantNotes: List[str]


class PackageGenerationResponse(BaseModel):
    """Response from package generation"""
    success: bool
    package: Optional[GeneratedPackageSchema] = None
    error: Optional[str] = None
    raw_response: Optional[str] = None


class ConversationHistoryResponse(BaseModel):
    """Response with conversation history"""
    conversation_id: str
    messages: List[ChatMessage]
    created_at: datetime
    updated_at: datetime
