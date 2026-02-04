"""Cart manager service for itinerary persistence"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.itinerary import ItineraryCart
from app.schemas.itinerary_schemas import Itinerary
import logging
import json

logger = logging.getLogger(__name__)


class CartManager:
    """
    Service for managing itinerary carts
    
    Responsibilities:
    - Save itineraries to database
    - Retrieve itineraries
    - Update itineraries
    - Handle cart expiry
    - Clean up expired carts
    """
    
    @staticmethod
    async def save_cart(
        db: AsyncSession,
        itinerary: Itinerary,
        cart_expiry_hours: int = 24
    ) -> ItineraryCart:
        """
        Save itinerary to cart
        
        Args:
            db: Database session
            itinerary: Itinerary object to save
            cart_expiry_hours: Hours until cart expires
            
        Returns:
            ItineraryCart database object
        """
        # Convert itinerary to dict for JSON storage
        itinerary_dict = itinerary.model_dump(mode='json')
        
        cart = ItineraryCart(
            user_id=itinerary.user_id,
            destination=itinerary.destination,
            start_date=itinerary.start_date,
            end_date=itinerary.end_date,
            total_days=itinerary.total_days,
            itinerary_data=[json.dumps(itinerary_dict)],  # Store as JSON string in array
            total_price=itinerary.total_price,
            currency=itinerary.currency,
            status="active",
            expires_at=ItineraryCart.create_expiry_time(cart_expiry_hours)
        )
        
        db.add(cart)
        await db.commit()
        await db.refresh(cart)
        
        logger.info(f"Saved cart {cart.id} for user {cart.user_id}")
        return cart
    
    @staticmethod
    async def get_cart(
        db: AsyncSession,
        cart_id: str,
        user_id: Optional[str] = None
    ) -> Optional[ItineraryCart]:
        """
        Retrieve cart by ID
        
        Args:
            db: Database session
            cart_id: Cart ID
            user_id: Optional user ID for authorization
            
        Returns:
            ItineraryCart or None
        """
        query = select(ItineraryCart).where(ItineraryCart.id == cart_id)
        
        if user_id:
            query = query.where(ItineraryCart.user_id == user_id)
        
        result = await db.execute(query)
        cart = result.scalar_one_or_none()
        
        if cart and cart.is_expired:
            logger.warning(f"Cart {cart_id} has expired")
            cart.status = "expired"
            await db.commit()
        
        return cart
    
    @staticmethod
    async def get_user_carts(
        db: AsyncSession,
        user_id: str,
        include_expired: bool = False
    ) -> List[ItineraryCart]:
        """
        Get all carts for a user
        
        Args:
            db: Database session
            user_id: User ID
            include_expired: Whether to include expired carts
            
        Returns:
            List of ItineraryCart objects
        """
        query = select(ItineraryCart).where(ItineraryCart.user_id == user_id)
        
        if not include_expired:
            query = query.where(
                and_(
                    ItineraryCart.status == "active",
                    ItineraryCart.expires_at > datetime.utcnow()
                )
            )
        
        query = query.order_by(ItineraryCart.created_at.desc())
        
        result = await db.execute(query)
        carts = result.scalars().all()
        
        return list(carts)
    
    @staticmethod
    async def update_cart(
        db: AsyncSession,
        cart_id: str,
        itinerary: Itinerary,
        user_id: Optional[str] = None
    ) -> ItineraryCart:
        """
        Update existing cart with new itinerary data
        
        Args:
            db: Database session
            cart_id: Cart ID to update
            itinerary: Updated itinerary
            user_id: Optional user ID for authorization
            
        Returns:
            Updated ItineraryCart
        """
        cart = await CartManager.get_cart(db, cart_id, user_id)
        
        if not cart:
            raise ValueError(f"Cart {cart_id} not found")
        
        if not cart.is_active:
            raise ValueError(f"Cart {cart_id} is not active (status: {cart.status})")
        
        # Update cart data
        itinerary_dict = itinerary.model_dump(mode='json')
        cart.itinerary_data = [json.dumps(itinerary_dict)]
        cart.total_price = itinerary.total_price
        cart.currency = itinerary.currency
        cart.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(cart)
        
        logger.info(f"Updated cart {cart_id}")
        return cart
    
    @staticmethod
    async def delete_cart(
        db: AsyncSession,
        cart_id: str,
        user_id: Optional[str] = None
    ) -> bool:
        """
        Delete cart
        
        Args:
            db: Database session
            cart_id: Cart ID
            user_id: Optional user ID for authorization
            
        Returns:
            True if deleted, False if not found
        """
        cart = await CartManager.get_cart(db, cart_id, user_id)
        
        if not cart:
            return False
        
        await db.delete(cart)
        await db.commit()
        
        logger.info(f"Deleted cart {cart_id}")
        return True
    
    @staticmethod
    async def mark_as_converted(
        db: AsyncSession,
        cart_id: str,
        user_id: Optional[str] = None
    ) -> ItineraryCart:
        """
        Mark cart as converted to booking
        
        Args:
            db: Database session
            cart_id: Cart ID
            user_id: Optional user ID for authorization
            
        Returns:
            Updated cart
        """
        cart = await CartManager.get_cart(db, cart_id, user_id)
        
        if not cart:
            raise ValueError(f"Cart {cart_id} not found")
        
        cart.status = "converted"
        cart.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(cart)
        
        logger.info(f"Marked cart {cart_id} as converted")
        return cart
    
    @staticmethod
    async def cleanup_expired_carts(
        db: AsyncSession,
        days_old: int = 7
    ) -> int:
        """
        Clean up old expired carts
        
        Args:
            db: Database session
            days_old: Delete carts expired more than this many days ago
            
        Returns:
            Number of carts deleted
        """
        from datetime import timedelta
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        query = select(ItineraryCart).where(
            and_(
                ItineraryCart.status == "expired",
                ItineraryCart.expires_at < cutoff_date
            )
        )
        
        result = await db.execute(query)
        carts = result.scalars().all()
        
        count = len(carts)
        
        for cart in carts:
            await db.delete(cart)
        
        await db.commit()
        
        logger.info(f"Cleaned up {count} expired carts")
        return count
    
    @staticmethod
    def cart_to_itinerary(cart: ItineraryCart) -> Itinerary:
        """
        Convert ItineraryCart database object to Itinerary schema
        
        Args:
            cart: ItineraryCart database object
            
        Returns:
            Itinerary schema object
        """
        # Parse JSON string from array
        itinerary_data = json.loads(cart.itinerary_data[0]) if cart.itinerary_data else {}
        return Itinerary(**itinerary_data)
