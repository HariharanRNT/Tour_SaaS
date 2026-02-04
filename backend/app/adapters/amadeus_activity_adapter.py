"""Amadeus Tours & Activities adapter for itinerary planning"""
from typing import Dict, Any
import re
import logging
from app.adapters.base_adapter import BaseActivityAdapter
from app.schemas.itinerary_schemas import NormalizedActivity, Location
from app.schemas.enums import ActivityType, TimeSlot, PhysicalIntensity, Category

logger = logging.getLogger(__name__)


class AmadeusActivityAdapter(BaseActivityAdapter):
    """Adapter to normalize Amadeus activities to internal schema"""
    
    def normalize(self, raw_activity: Dict[str, Any]) -> NormalizedActivity:
        """
        Convert Amadeus activity to NormalizedActivity
        
        Args:
            raw_activity: Raw activity data from Amadeus API
            
        Returns:
            NormalizedActivity in internal format
        """
        # Extract duration
        duration_str = raw_activity.get('minimumDuration', '') or raw_activity.get('duration', '')
        duration_hours = self._parse_duration(duration_str)
        
        # Classify activity type
        activity_type = self.classify_activity_type(duration_str)
        
        # Determine time slot
        time_slot = self.determine_time_slot(raw_activity)
        
        # Infer physical intensity
        intensity = self._infer_intensity(raw_activity)
        
        # Map category
        category = self._map_category(raw_activity)
        
        # Extract location
        geo_code = raw_activity.get('geoCode', {})
        location = Location(
            latitude=geo_code.get('latitude', 0.0),
            longitude=geo_code.get('longitude', 0.0),
            address='',
            city='',
            country=''
        )
        
        # Extract pricing
        price_info = raw_activity.get('price', {})
        price = float(price_info.get('amount', 0))
        currency = price_info.get('currencyCode', 'USD')
        
        # Extract images
        pictures = raw_activity.get('pictures', [])
        images = [pic for pic in pictures if isinstance(pic, str)][:5]
        
        return NormalizedActivity(
            activity_id=f"amadeus_{raw_activity['id']}",
            supplier="amadeus",
            supplier_activity_id=raw_activity['id'],
            title=raw_activity.get('name', 'Untitled Activity'),
            description=raw_activity.get('shortDescription', '') or raw_activity.get('description', ''),
            category=category,
            duration_hours=duration_hours,
            activity_type=activity_type,
            preferred_time_slot=time_slot,
            price_per_person=price,
            currency=currency,
            physical_intensity=intensity,
            location=location,
            images=images,
            rating=float(raw_activity.get('rating', 0)),
            booking_link=raw_activity.get('bookingLink', '')
        )
    
    def classify_activity_type(self, duration: str) -> ActivityType:
        """
        Parse duration string and classify as FULL_DAY, HALF_DAY, or SHORT
        
        Examples:
            "3 hours" -> SHORT
            "4 hours 30 minutes" -> HALF_DAY
            "1 day" -> FULL_DAY
            "8 hours" -> FULL_DAY
        """
        hours = self._parse_duration(duration)
        
        if hours >= 6:
            return ActivityType.FULL_DAY
        elif hours >= 3:
            return ActivityType.HALF_DAY
        else:
            return ActivityType.SHORT
    
    def determine_time_slot(self, activity: Dict[str, Any]) -> TimeSlot:
        """
        Infer preferred time slot from activity name and description
        
        Looks for keywords like:
        - MORNING: sunrise, breakfast, morning, early
        - EVENING: sunset, evening, night, dinner
        - FULL_DAY: full day, all day
        - AFTERNOON: default
        """
        text = (
            activity.get('name', '') + ' ' + 
            activity.get('shortDescription', '') + ' ' +
            activity.get('description', '')
        ).lower()
        
        # Check for FULL_DAY indicators
        duration_str = activity.get('minimumDuration', '') or activity.get('duration', '')
        if self.classify_activity_type(duration_str) == ActivityType.FULL_DAY:
            return TimeSlot.FULL_DAY
        
        # Check for time-specific keywords
        morning_keywords = ['sunrise', 'breakfast', 'morning', 'early', 'dawn']
        evening_keywords = ['sunset', 'evening', 'night', 'dinner', 'twilight', 'dusk']
        
        if any(word in text for word in morning_keywords):
            return TimeSlot.MORNING
        elif any(word in text for word in evening_keywords):
            return TimeSlot.EVENING
        else:
            return TimeSlot.AFTERNOON  # Default
    
    def _infer_intensity(self, activity: Dict[str, Any]) -> PhysicalIntensity:
        """
        Infer physical intensity from activity name and description
        
        HIGH: trekking, hiking, climbing, extreme sports
        LOW: museum, cruise, show, spa
        MEDIUM: default
        """
        text = (
            activity.get('name', '') + ' ' + 
            activity.get('shortDescription', '') + ' ' +
            activity.get('description', '')
        ).lower()
        
        high_intensity_keywords = [
            'trek', 'hike', 'climb', 'adventure', 'extreme', 'rafting',
            'kayak', 'surf', 'dive', 'mountain', 'cycling', 'bike'
        ]
        
        low_intensity_keywords = [
            'museum', 'tour', 'cruise', 'show', 'spa', 'relax',
            'massage', 'theater', 'gallery', 'exhibition', 'transfer'
        ]
        
        if any(word in text for word in high_intensity_keywords):
            return PhysicalIntensity.HIGH
        elif any(word in text for word in low_intensity_keywords):
            return PhysicalIntensity.LOW
        else:
            return PhysicalIntensity.MEDIUM
    
    def _map_category(self, activity: Dict[str, Any]) -> Category:
        """Map activity to category based on name and description"""
        text = (
            activity.get('name', '') + ' ' + 
            activity.get('shortDescription', '')
        ).lower()
        
        # Category keyword mapping
        category_keywords = {
            Category.ADVENTURE: ['adventure', 'extreme', 'rafting', 'kayak', 'dive'],
            Category.CULTURAL: ['museum', 'temple', 'heritage', 'cultural', 'history'],
            Category.FOOD: ['food', 'culinary', 'dining', 'restaurant', 'cuisine'],
            Category.WATER_SPORTS: ['water', 'surf', 'dive', 'snorkel', 'boat'],
            Category.NATURE: ['nature', 'wildlife', 'park', 'garden', 'safari'],
            Category.SHOPPING: ['shopping', 'market', 'mall', 'bazaar'],
            Category.ENTERTAINMENT: ['show', 'theater', 'performance', 'concert'],
            Category.RELAXATION: ['spa', 'massage', 'relax', 'wellness'],
        }
        
        for category, keywords in category_keywords.items():
            if any(word in text for word in keywords):
                return category
        
        # Default to sightseeing
        return Category.SIGHTSEEING
    
    def _parse_duration(self, duration_str: str) -> float:
        """
        Parse duration string to hours
        
        Examples:
            "3 hours" -> 3.0
            "1 day" -> 8.0
            "4 hours 30 minutes" -> 4.5
            "2 days" -> 16.0
        """
        if not duration_str:
            return 3.0  # Default to 3 hours
        
        duration_str = duration_str.lower().strip()
        hours = 0.0
        
        # Parse days (assume 8 hours per day)
        day_match = re.search(r'(\d+)\s*day', duration_str)
        if day_match:
            days = int(day_match.group(1))
            hours += days * 8
        
        # Parse hours
        hour_match = re.search(r'(\d+)\s*hour', duration_str)
        if hour_match:
            hours += int(hour_match.group(1))
        
        # Parse minutes
        minute_match = re.search(r'(\d+)\s*minute', duration_str)
        if minute_match:
            minutes = int(minute_match.group(1))
            hours += minutes / 60.0
        
        # If no match found, try to extract any number
        if hours == 0:
            number_match = re.search(r'(\d+)', duration_str)
            if number_match:
                hours = float(number_match.group(1))
        
        return hours if hours > 0 else 3.0  # Default to 3 hours
