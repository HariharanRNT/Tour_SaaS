"""Enhanced Booking Service with customization support"""

from typing import List, Optional, Dict, Any
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.models import Booking, BookingCustomization, Package, ItineraryItem
from app.services.package_service import PackageService


class BookingService:
    """Service for managing bookings with itinerary customizations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.package_service = PackageService(db)
    
    async def create_booking_with_customizations(
        self,
        package_id: uuid.UUID,
        user_id: uuid.UUID,
        travel_date: date,
        number_of_travelers: int,
        customizations: List[Dict[str, Any]] = None
    ) -> Booking:
        """
        Create a booking with optional itinerary customizations
        """
        # Get package
        stmt = select(Package).where(Package.id == package_id)
        result = await self.db.execute(stmt)
        package = result.scalar_one_or_none()
        
        if not package:
            raise ValueError(f"Package {package_id} not found")
        
        # Calculate total amount
        total_amount = package.price_per_person * number_of_travelers
        
        # Create booking
        booking = Booking(
            package_id=package_id,
            user_id=user_id,
            travel_date=travel_date,
            number_of_travelers=number_of_travelers,
            total_amount=total_amount,
            booking_reference=self._generate_booking_reference()
        )
        
        self.db.add(booking)
        await self.db.flush()  # Get booking ID
        
        # Store customizations if provided
        if customizations:
            for custom in customizations:
                customization = BookingCustomization(
                    booking_id=booking.id,
                    day_number=custom.get('day_number'),
                    time_slot=custom.get('time_slot'),
                    activity_title=custom.get('activity_title'),
                    activity_description=custom.get('activity_description'),
                    activity_price=custom.get('activity_price'),
                    is_removed=custom.get('is_removed', False),
                    is_custom=custom.get('is_custom', False),
                    original_item_id=custom.get('original_item_id'),
                    display_order=custom.get('display_order', 0)
                )
                self.db.add(customization)
        
        await self.db.commit()
        await self.db.refresh(booking)
        
        return booking
    
    async def get_booking_with_customizations(
        self,
        booking_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Get booking with all customizations"""
        
        stmt = select(Booking).where(Booking.id == booking_id)
        result = await self.db.execute(stmt)
        booking = result.scalar_one_or_none()
        
        if not booking:
            raise ValueError(f"Booking {booking_id} not found")
        
        # Get customizations
        stmt = select(BookingCustomization).where(
            BookingCustomization.booking_id == booking_id
        ).order_by(
            BookingCustomization.day_number,
            BookingCustomization.display_order
        )
        result = await self.db.execute(stmt)
        customizations = result.scalars().all()
        
        # Get original package itinerary
        package_data = await self.package_service.get_package_with_itinerary(
            booking.package_id
        )
        
        # Merge customizations with original itinerary
        final_itinerary = self._merge_customizations(
            package_data['itinerary_by_day'],
            customizations
        )
        
        return {
            'booking': booking,
            'customizations': customizations,
            'final_itinerary': final_itinerary
        }
    
    def _merge_customizations(
        self,
        original_itinerary: List[Dict],
        customizations: List[BookingCustomization]
    ) -> List[Dict]:
        """Merge customizations with original package itinerary"""
        
        # Create a copy of original itinerary
        merged = []
        
        for day_data in original_itinerary:
            day_number = day_data['day_number']
            day_customizations = [c for c in customizations if c.day_number == day_number]
            
            # Start with original activities
            day_result = {
                'day_number': day_number,
                'morning': list(day_data.get('morning', [])),
                'afternoon': list(day_data.get('afternoon', [])),
                'evening': list(day_data.get('evening', [])),
                'night': list(day_data.get('night', []))
            }
            
            # Apply customizations
            for custom in day_customizations:
                slot = custom.time_slot or 'unassigned'
                
                if custom.is_removed and custom.original_item_id:
                    # Remove original activity
                    day_result[slot] = [
                        a for a in day_result.get(slot, [])
                        if a.get('id') != custom.original_item_id
                    ]
                
                elif custom.is_custom:
                    # Add custom activity
                    if slot not in day_result:
                        day_result[slot] = []
                    
                    day_result[slot].append({
                        'id': custom.id,
                        'title': custom.activity_title,
                        'description': custom.activity_description,
                        'price': custom.activity_price,
                        'is_custom': True
                    })
            
            merged.append(day_result)
        
        return merged
    
    def _generate_booking_reference(self) -> str:
        """Generate unique booking reference"""
        import random
        import string
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
