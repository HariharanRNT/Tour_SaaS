import asyncio
import json
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.models import Booking, Package, BookingReview
from app.services.review_service import send_review_form, submit_review, verify_review_token
from app.database import get_db

async def main():
    from app.database import engine
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as db:
        # Find a booking that is Completed or Confirmed
        from sqlalchemy import select
        result = await db.execute(select(Booking).limit(1))
        booking = result.scalars().first()
        
        if not booking:
            print("No bookings found to test.")
            return

        print(f"Testing with Booking ID: {booking.id}")
        
        # 1. Send Review Form
        try:
            print("Sending review form...")
            await send_review_form(booking.id, db)
            print("Review form sent successfully. (Note: Email was queued/sent)")
        except Exception as e:
            print(f"Error sending review form: {e}")
            return
            
        # Refetch booking to get the token
        await db.refresh(booking)
        print(f"Review Tag: {booking.review_tag}")
        
        # In a real scenario, the token is sent in the email.
        # We need to generate the token directly here for testing the submission.
        from app.services.review_service import generate_review_token
        token = generate_review_token(booking.id)
        print(f"Generated Token: {token}")
        
        # 2. Submit Review
        try:
            print("Submitting review...")
            from pydantic import BaseModel
            class ReviewPayload(BaseModel):
                rating: int
                feedback: str
                
            payload = ReviewPayload(rating=5, feedback="Amazing trip!")
            await submit_review(token, payload, db)
            print("Review submitted successfully.")
        except Exception as e:
            print(f"Error submitting review: {e}")
            return
            
        # 3. Verify Package Rating
        await db.refresh(booking)
        result = await db.execute(select(Package).where(Package.id == booking.package_id))
        pkg = result.scalars().first()
        
        print(f"Booking Review Tag: {booking.review_tag}")
        print(f"Package Average Rating: {pkg.average_rating}")
        print(f"Package Review Count: {pkg.review_count}")

if __name__ == '__main__':
    asyncio.run(main())
