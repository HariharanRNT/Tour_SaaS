"""Assignment engine for distributing activities across days"""
from typing import List, Tuple, Optional
from app.schemas.itinerary_schemas import NormalizedActivity, DayPlan, DaySlot
from app.schemas.enums import ActivityType, TimeSlot, PhysicalIntensity
from app.services.geo_resolver import GeoResolverService
import logging

logger = logging.getLogger(__name__)


class AssignmentRules:
    """Rules for activity assignment"""
    
    MAX_ACTIVITIES_PER_DAY = 2
    MAX_CONSECUTIVE_HIGH_INTENSITY_DAYS = 1
    MAX_DISTANCE_SAME_DAY_KM = 30
    
    @staticmethod
    def can_assign_to_day(
        day: DayPlan,
        activity: NormalizedActivity,
        previous_day: Optional[DayPlan] = None
    ) -> Tuple[bool, str]:
        """
        Check if activity can be assigned to day
        
        Args:
            day: Day to assign to
            activity: Activity to assign
            previous_day: Previous day (for intensity check)
            
        Returns:
            (can_assign, reason)
        """
        # Rule 1: Check day capacity
        if day.is_full:
            return False, "Day is full"
        
        # Rule 2: Only one FULL_DAY activity per day
        if activity.activity_type == ActivityType.FULL_DAY:
            if day.total_activities > 0:
                return False, "Day already has activities, cannot add FULL_DAY"
            if not day.can_add_activity(activity):
                return False, "MORNING or AFTERNOON slot not available"
        
        # Rule 3: Maximum activities per day
        if day.total_activities >= AssignmentRules.MAX_ACTIVITIES_PER_DAY:
            return False, f"Maximum {AssignmentRules.MAX_ACTIVITIES_PER_DAY} activities per day reached"
        
        # Rule 4: Check slot availability
        if not day.can_add_activity(activity):
            return False, f"{activity.preferred_time_slot.value} slot not available"
        
        # Rule 5: Avoid consecutive high-intensity days
        if previous_day and activity.physical_intensity == PhysicalIntensity.HIGH:
            prev_has_high_intensity = any(
                slot.activity and slot.activity.physical_intensity == PhysicalIntensity.HIGH
                for slot in previous_day.slots
                if slot.activity
            )
            if prev_has_high_intensity:
                return False, "Consecutive high-intensity activities not recommended"
        
        # Rule 6: Geographic proximity (if day has activities)
        if day.total_activities > 0:
            existing_activities = [
                slot.activity for slot in day.slots 
                if slot.activity is not None
            ]
            for existing in existing_activities:
                try:
                    distance = GeoResolverService.calculate_distance_between_locations(
                        existing.location,
                        activity.location
                    )
                    if distance > AssignmentRules.MAX_DISTANCE_SAME_DAY_KM:
                        return False, f"Activity too far from other activities ({distance:.1f} km)"
                except Exception as e:
                    logger.warning(f"Distance calculation failed: {e}")
        
        return True, "OK"


class ItineraryAssignmentEngine:
    """Engine for assigning activities to days"""
    
    def assign_activities(
        self,
        activities: List[NormalizedActivity],
        days: List[DayPlan]
    ) -> Tuple[List[DayPlan], List[NormalizedActivity]]:
        """
        Distribute activities across days using assignment rules
        
        Args:
            activities: List of activities to assign
            days: List of day plans
            
        Returns:
            (updated_days, unassigned_activities)
        """
        # Step 1: Prioritize activities
        sorted_activities = self._prioritize_activities(activities)
        
        unassigned = []
        
        # Step 2: Assign activities sequentially
        for activity in sorted_activities:
            assigned = False
            
            # Try to assign to each day
            for day_idx, day in enumerate(days):
                # Get previous day for intensity check
                prev_day = days[day_idx - 1] if day_idx > 0 else None
                
                # Check if can assign
                can_assign, reason = AssignmentRules.can_assign_to_day(
                    day, activity, prev_day
                )
                
                if can_assign:
                    # Assign activity to appropriate slot
                    self._assign_to_slot(day, activity)
                    assigned = True
                    logger.info(f"Assigned '{activity.title}' to Day {day.day_number}, {activity.preferred_time_slot.value}")
                    break
                else:
                    logger.debug(f"Cannot assign '{activity.title}' to Day {day.day_number}: {reason}")
            
            if not assigned:
                unassigned.append(activity)
                logger.warning(f"Could not assign '{activity.title}' to any day")
        
        return days, unassigned
    
    def _prioritize_activities(
        self,
        activities: List[NormalizedActivity]
    ) -> List[NormalizedActivity]:
        """
        Sort activities by assignment priority
        
        Priority order:
        1. FULL_DAY activities (hardest to place)
        2. HIGH intensity activities (need spacing)
        3. Longer duration activities
        4. Higher rated activities
        """
        def priority_score(activity: NormalizedActivity) -> Tuple:
            type_priority = {
                ActivityType.FULL_DAY: 0,
                ActivityType.HALF_DAY: 1,
                ActivityType.SHORT: 2
            }
            
            intensity_priority = {
                PhysicalIntensity.HIGH: 0,
                PhysicalIntensity.MEDIUM: 1,
                PhysicalIntensity.LOW: 2
            }
            
            return (
                type_priority.get(activity.activity_type, 3),
                intensity_priority.get(activity.physical_intensity, 3),
                -activity.duration_hours,  # Negative for descending
                -activity.rating
            )
        
        return sorted(activities, key=priority_score)
    
    def _assign_to_slot(
        self,
        day: DayPlan,
        activity: NormalizedActivity
    ):
        """
        Assign activity to appropriate time slot in day
        
        Args:
            day: Day to assign to
            activity: Activity to assign
        """
        if activity.activity_type == ActivityType.FULL_DAY:
            # Occupy MORNING and AFTERNOON
            for slot in day.slots:
                if slot.time_slot in [TimeSlot.MORNING, TimeSlot.AFTERNOON]:
                    slot.activity = activity
                    slot.is_available = False
            day.total_activities += 1
            day.is_full = True  # FULL_DAY fills the day
        else:
            # Assign to preferred slot
            for slot in day.slots:
                if slot.time_slot == activity.preferred_time_slot and slot.is_available:
                    slot.activity = activity
                    slot.is_available = False
                    day.total_activities += 1
                    
                    # Check if day is full
                    if day.total_activities >= AssignmentRules.MAX_ACTIVITIES_PER_DAY:
                        day.is_full = True
                    break
