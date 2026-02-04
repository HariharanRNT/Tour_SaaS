"""Enums for itinerary planning"""
from enum import Enum


class ActivityType(str, Enum):
    """Type of activity based on duration"""
    FULL_DAY = "FULL_DAY"      # 6+ hours
    HALF_DAY = "HALF_DAY"      # 3-5 hours
    SHORT = "SHORT"             # < 3 hours


class TimeSlot(str, Enum):
    """Time slots within a day"""
    MORNING = "MORNING"         # 6 AM - 12 PM
    AFTERNOON = "AFTERNOON"     # 12 PM - 6 PM
    EVENING = "EVENING"         # 6 PM - 10 PM
    FULL_DAY = "FULL_DAY"       # MORNING + AFTERNOON


class PhysicalIntensity(str, Enum):
    """Physical intensity level of activity"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Category(str, Enum):
    """Activity categories"""
    SIGHTSEEING = "sightseeing"
    ADVENTURE = "adventure"
    CULTURAL = "cultural"
    FOOD = "food"
    RELAXATION = "relaxation"
    WATER_SPORTS = "water_sports"
    SHOPPING = "shopping"
    ENTERTAINMENT = "entertainment"
    NATURE = "nature"
    GENERAL = "general"
