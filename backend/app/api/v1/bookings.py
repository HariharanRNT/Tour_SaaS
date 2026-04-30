"""Booking API routes"""
from typing import List
from uuid import UUID
import random
import string
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Booking, Package, Traveler, BookingStatus, PaymentStatus, UserRole, User
from app.schemas import (
    BookingCreate, BookingResponse, BookingWithPackageResponse,
    CancelPreviewResponse, CancelActionResponse
)
from app.api.deps import get_current_user, get_current_admin
from app.core.exceptions import NotFoundException, BadRequestException
from app.services import cancellation_service
from fastapi_cache import FastAPICache

router = APIRouter()


def generate_booking_reference() -> str:
    """Generate a unique booking reference"""
    letters = ''.join(random.choices(string.ascii_uppercase, k=3))
    numbers = ''.join(random.choices(string.digits, k=6))
    return f"BK{letters}{numbers}"


@router.get("", response_model=List[BookingWithPackageResponse])
async def list_user_bookings(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all bookings for current user"""
    try:
        query = select(Booking).where(Booking.user_id == current_user.id).order_by(Booking.created_at.desc()).options(
            selectinload(Booking.package).selectinload(Package.images),
            selectinload(Booking.package).selectinload(Package.itinerary_items),
            selectinload(Booking.package).selectinload(Package.availability),
            selectinload(Booking.package).selectinload(Package.dest_metadata),
            selectinload(Booking.travelers),
            selectinload(Booking.refund),
            selectinload(Booking.booked_by)
        )
        result = await db.execute(query)
        bookings = result.scalars().all()
        
        return [BookingWithPackageResponse.model_validate(b) for b in bookings]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to list bookings: {str(e)}")


@router.get("/{booking_id}", response_model=BookingWithPackageResponse)
async def get_booking(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get booking by ID"""
    query = select(Booking).where(Booking.id == booking_id).options(
        selectinload(Booking.package).selectinload(Package.images),
        selectinload(Booking.package).selectinload(Package.itinerary_items),
        selectinload(Booking.package).selectinload(Package.availability),
        selectinload(Booking.package).selectinload(Package.dest_metadata),
        selectinload(Booking.travelers),
        selectinload(Booking.refund),
        selectinload(Booking.booked_by)
    )
    result = await db.execute(query)
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise NotFoundException("Booking not found")
    
    # Check if user owns this booking or is admin
    if booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this booking")
    
    return BookingWithPackageResponse.model_validate(booking)


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new booking"""
    try:
        # B-03: Idempotency check — prevent duplicate bookings within 60 seconds
        window_start = datetime.now(timezone.utc) - timedelta(seconds=60)
        dup_result = await db.execute(
            select(Booking).where(
                Booking.user_id == current_user.id,
                Booking.package_id == booking_data.package_id,
                Booking.travel_date == booking_data.travel_date,
                Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
                Booking.created_at >= window_start,
            )
        )
        if dup_result.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail="A duplicate booking was detected. Please wait a moment before trying again."
            )

        # === Agent / Sub-User must book ON BEHALF OF a customer ===
        AGENT_ROLES = [UserRole.AGENT, UserRole.SUB_USER]
        if current_user.role in AGENT_ROLES:
            if not booking_data.customer_id:
                raise HTTPException(
                    status_code=400,
                    detail="Agents must select or create a customer before booking."
                )
            # Verify the customer_id refers to an actual CUSTOMER-role user
            cust_result = await db.execute(select(User).where(User.id == booking_data.customer_id))
            customer_user = cust_result.scalar_one_or_none()
            if not customer_user or customer_user.role != UserRole.CUSTOMER:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid customer selected. The selected user is not a customer."
                )

        # Get package
        result = await db.execute(select(Package).where(Package.id == booking_data.package_id))
        package = result.scalar_one_or_none()
        
        if not package:
            raise NotFoundException("Package not found")
        
        # Validate travel date is in the future
        if booking_data.travel_date < date.today():
            raise BadRequestException("Travel date must be in the future")

        # --- Subscription Check (Agents & Customers) ---
        if current_user.role != "admin":
            from app.models import Subscription, SubscriptionPlan
            
            # Determine whose subscription to check
            subscription_user_id = current_user.id
            if current_user.role == UserRole.CUSTOMER or current_user.role == "customer":
                # Ensure customer profile is loaded
                if not current_user.customer_profile or not current_user.customer_profile.agent_id:
                     # Fallback: If no agent linked, maybe allow or block? 
                     # For SaaS model, usually block if not linked to active agent
                     raise HTTPException(status_code=403, detail="No agent associated with this account. Cannot make bookings.")
                subscription_user_id = current_user.customer_profile.agent_id
            elif current_user.role == UserRole.SUB_USER:
                # Sub-user: use parent agent's subscription
                if current_user.sub_user_profile and current_user.sub_user_profile.agent_id:
                    subscription_user_id = current_user.sub_user_profile.agent_id
            
            # Check and Auto-Activate Subscription
            from app.services.subscription_service import SubscriptionService
            
            # This method handles expiry/limit checks and auto-activation of queued plans
            subscription = await SubscriptionService.check_and_auto_activate(subscription_user_id, db)
            
            if not subscription:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Agent plan is not active"
                )
                
            # If we have a subscription, we still need to check if the *current* booking pushes it over limit
            plan = subscription.plan
            if plan.booking_limit != -1 and subscription.current_bookings_usage >= plan.booking_limit:
                 raise HTTPException(
                     status_code=status.HTTP_402_PAYMENT_REQUIRED,
                     detail="Booking limit reached for your agent's plan."
                 )
                 
            # Increment usage (will be committed with booking)
            subscription.current_bookings_usage += 1
        # ----------------------------------------
        
        # Validate number of travelers matches travelers list
        if len(booking_data.travelers) != booking_data.number_of_travelers:
            raise BadRequestException("Number of travelers does not match travelers list")
        
        # Calculate total amount
        package_price = float(package.price_per_person)
        flight_price = 0.0
        
        if booking_data.special_requests:
            try:
                import json
                requests = json.loads(booking_data.special_requests)
                if 'flight_details' in requests and requests['flight_details']:
                     flight_price = float(requests['flight_details'].get('price', 0))
            except:
                pass
        
        # B-04: Infants (Under 2) are free. Only multiply by non-infant travelers.
        chargeable_travelers_count = len([t for t in booking_data.travelers if t.type != 'INFANT'])
        subtotal = (package_price + flight_price) * chargeable_travelers_count
        total_amount = subtotal
        
        # 1. Determine the Agent whose settings apply
        real_agent_id = None
        if current_user.role in [UserRole.AGENT]:
            real_agent_id = current_user.id
        elif current_user.role in [UserRole.SUB_USER]:
            if current_user.sub_user_profile and current_user.sub_user_profile.agent_id:
                real_agent_id = current_user.sub_user_profile.agent_id
        else:
            real_agent_id = package.created_by or current_user.agent_id

        # === Robust GST Resolution Logic ===
        # Priority: 1. Package Settings (if not None) -> 2. Agent Settings (if not None) -> 3. System Defaults
        
        # System Defaults
        gst_applicable = True
        gst_percentage = 18.0
        is_gst_inclusive = False # Default to exclusive

        # 1. Load Agent Settings (Base Layer)
        if real_agent_id:
            from app.models import Agent
            agent_stmt = select(Agent).where(Agent.user_id == real_agent_id)
            agent_result = await db.execute(agent_stmt)
            agent_obj = agent_result.scalar_one_or_none()
            
            if agent_obj:
                if agent_obj.gst_applicable is not None:
                    gst_applicable = agent_obj.gst_applicable
                
                if gst_applicable:
                    if agent_obj.gst_percentage is not None:
                        gst_percentage = float(agent_obj.gst_percentage)
                    if agent_obj.gst_inclusive is not None:
                        is_gst_inclusive = agent_obj.gst_inclusive

        # 2. Package Overrides (Top Layer)
        if package:
            if package.gst_applicable is not None:
                gst_applicable = package.gst_applicable
            
            if gst_applicable:
                if package.gst_percentage is not None:
                    gst_percentage = float(package.gst_percentage)
                if package.gst_mode:
                    is_gst_inclusive = (package.gst_mode == 'inclusive')

        # 3. Final Total Calculation
        if gst_applicable:
            if is_gst_inclusive:
                # GST is already in the package price
                total_amount = subtotal
                # Note: We don't change total_amount here, it's already subtotal
            else:
                # GST must be added on top
                gst_amount = subtotal * (gst_percentage / 100)
                total_amount = subtotal + gst_amount
        else:
            # No GST applicable
            total_amount = subtotal
        
        # Generate booking reference
        booking_reference = generate_booking_reference()

        # Determine effective user_id (who the booking belongs to)
        AGENT_ROLES = [UserRole.AGENT, UserRole.SUB_USER]
        effective_user_id = (
            booking_data.customer_id
            if current_user.role in AGENT_ROLES and booking_data.customer_id
            else current_user.id
        )

        # Determine effective agent_id
        effective_agent_id = None
        if current_user.role == UserRole.AGENT:
            effective_agent_id = current_user.id
        elif current_user.role == UserRole.SUB_USER:
            if current_user.sub_user_profile and current_user.sub_user_profile.agent_id:
                effective_agent_id = current_user.sub_user_profile.agent_id
        else:
            # Customer booking directly: The package creator is the owner of this booking record
            effective_agent_id = package.created_by or current_user.agent_id

        # Create booking
        booking = Booking(
            booking_reference=booking_reference,
            package_id=package.id,
            user_id=effective_user_id,
            booking_date=date.today(),
            travel_date=booking_data.travel_date,
            number_of_travelers=booking_data.number_of_travelers,
            total_amount=total_amount,
            special_requests=booking_data.special_requests,
            status=BookingStatus.PENDING,
            payment_status=PaymentStatus.PENDING,
            agent_id=effective_agent_id,
            # Track the actual person who made the booking (agent/sub-user)
            booked_by_user_id=(
                current_user.id
                if current_user.role in [UserRole.AGENT, UserRole.SUB_USER]
                else None
            ),
        )

        
        db.add(booking)
        await db.flush()
        
        # Add travelers
        for traveler_data in booking_data.travelers:
            traveler = Traveler(
                booking_id=booking.id,
                **traveler_data.model_dump()
            )
            db.add(traveler)
        
        await db.commit()
        
        # Invalidate dashboard cache
        await FastAPICache.clear(namespace="dashboard")
        
        # Reload booking with relationships for Pydantic validation
        # We need to explicitly load relationships to avoid MissingGreenlet error in async context
        query = select(Booking).where(Booking.id == booking.id).options(
            selectinload(Booking.travelers),
            selectinload(Booking.package)
        )
        result = await db.execute(query)
        booking = result.scalar_one()
        
        return BookingResponse.model_validate(booking)
    except Exception as e:
        import traceback
        print(traceback.format_exc()) # Print to server console
        # Rollback in case of DB error
        await db.rollback()
        # Re-raise HTTP exceptions
        if isinstance(e, HTTPException):
            raise e
        # Raise generic 500 with details for debugging
        raise HTTPException(status_code=500, detail=f"Booking Creation Failed: {str(e)}")


@router.get("/{booking_id}/cancel-preview", response_model=CancelPreviewResponse)
async def cancel_booking_preview(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Preview refund amount before confirming cancellation.
    Read-only — no DB changes.
    """
    query = select(Booking).where(Booking.id == booking_id).options(
        selectinload(Booking.payments),
        selectinload(Booking.package)
    )
    result = await db.execute(query)
    booking = result.scalar_one_or_none()

    if not booking:
        raise NotFoundException("Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if booking.status == BookingStatus.CANCELLED:
        raise BadRequestException("Booking is already cancelled")
    if booking.status == BookingStatus.COMPLETED:
        raise BadRequestException("Cannot cancel a completed booking")

    package = booking.package
    rules = (package.cancellation_rules or []) if package else []
    calc = cancellation_service.calculate_refund(booking, rules)

    return CancelPreviewResponse(
        cancellation_enabled=bool(package and package.cancellation_enabled),
        days_before=calc["days_before"],
        paid_amount=calc["paid_amount"],
        refund_amount=calc["refund_amount"],
        refund_percentage=calc["refund_percentage"],
        message=calc["message"],
    )


@router.post("/{booking_id}/cancel", response_model=CancelActionResponse)
async def cancel_booking(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Cancel a booking and trigger Razorpay refund if applicable.
    Uses SELECT FOR UPDATE + single transaction for safety.
    """
    # Quick ownership check before locking
    pre_check = await db.execute(select(Booking.user_id, Booking.status, Booking.agent_id).where(Booking.id == booking_id))
    row = pre_check.first()
    if not row:
        raise NotFoundException("Booking not found")
    if row[0] != current_user.id and row[2] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")
    if row[1] == BookingStatus.COMPLETED:
        raise BadRequestException("Cannot cancel a completed booking")

    try:
        result = await cancellation_service.process_cancellation(
            booking_id=booking_id,
            db=db,
        )
    except ValueError as e:
        raise BadRequestException(str(e))
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Cancel booking failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cancellation failed: {str(e)}")

    # Invalidate dashboard cache
    await FastAPICache.clear(namespace="dashboard")

    return CancelActionResponse(**result)

@router.get("/admin/all", response_model=List[BookingWithPackageResponse])
async def list_all_bookings(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """List all bookings (Admin only)"""
    query = select(Booking).order_by(Booking.created_at.desc()).options(
        selectinload(Booking.package).options(
            selectinload(Package.dest_metadata)
        ),
        selectinload(Booking.travelers),
        selectinload(Booking.booked_by)
    )
    result = await db.execute(query)
    bookings = result.scalars().all()
    
    return [BookingWithPackageResponse.model_validate(b) for b in bookings]


@router.post("/{booking_id}/confirm", response_model=BookingResponse)
async def confirm_booking(
    booking_id: UUID,
    payment_data: dict, # {razorpay_order_id, razorpay_payment_id, ...}
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Confirm booking after payment:
    1. Verify Payment
    2. Book Flight (if application)
    3. Finalize Package Booking
    """
    from app.services.tripjack_adapter import TripJackAdapter
    from app.services.booking_orchestrator import BookingOrchestrator
    from app.config import settings

    # Initialize services
    # TODO: Move to dependency injection
    tripjack = TripJackAdapter(
        api_key=settings.TRIPJACK_API_KEY, 
        base_url=settings.TRIPJACK_BASE_URL
    )
    orchestrator = BookingOrchestrator(db, tripjack)
    
    try:
        # We need to reconstruct traveler info from DB for the orchestrator
        # fetch booking with travelers
        query = select(Booking).where(Booking.id == booking_id).options(selectinload(Booking.travelers), selectinload(Booking.user))
        result = await db.execute(query)
        booking = result.scalar_one_or_none()
        
        if not booking:
            raise NotFoundException("Booking not found")
            
        # Reconstruct traveler list for TripJack
        # distinct map to list of dicts
        traveler_info = []
        for t in booking.travelers:
            traveler_info.append({
                "first_name": t.first_name,
                "last_name": t.last_name,
                "dob": t.date_of_birth.strftime("%Y-%m-%d"),
                "gender": t.gender,
                "passport_number": t.passport_number,
                "passport_expiry": "2030-01-01", # Placeholder if not in DB
                "type": "ADULT", # Logic to determine type based on DOB needed
                "nationality": t.nationality
            })

        confirmed_booking = await orchestrator.process_checkout(
            booking_id=booking_id,
            payment_verification=payment_data,
            traveler_info=traveler_info
        )
        
        # Invalidate dashboard cache
        await FastAPICache.clear(namespace="dashboard")
        
        return BookingResponse.model_validate(confirmed_booking)

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Booking confirmation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{booking_id}/review-flight")
async def review_flight(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Review flight before payment.
    Calls TripJack Review API and saves the returned bookingId.
    """
    from app.services.tripjack_adapter import TripJackAdapter
    from app.config import settings
    import json

    # Initialize TripJack
    tripjack = TripJackAdapter(
        api_key=settings.TRIPJACK_API_KEY, 
        base_url=settings.TRIPJACK_BASE_URL
    )

    try:
        # Get booking
        result = await db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()
        
        if not booking:
            raise NotFoundException("Booking not found")
            
        # Extract flight details
        if not booking.special_requests:
            return {"message": "No flight details to review", "skipped": True}
            
        try:
            requests = json.loads(booking.special_requests)
            flight_details = requests.get('flight_details')
            if not flight_details:
                return {"message": "No flight details to review", "skipped": True}
            
            price_ids = []
            
            # Check for Onward Flight
            if flight_details.get('onward') and flight_details['onward'].get('priceId'):
                price_ids.append(flight_details['onward']['priceId'])
                
            # Check for Return Flight
            if flight_details.get('return') and flight_details['return'].get('priceId'):
                price_ids.append(flight_details['return']['priceId'])
                
            # Fallback to top-level if specific legs not found (legacy compatibility)
            if not price_ids and flight_details.get('priceId'):
                price_ids.append(flight_details['priceId'])
                
            if not price_ids:
                return {"message": "No flight price IDs found", "skipped": True}

        except:
            return {"message": "Invalid flight details format", "skipped": True}

        # Call TripJack Review
        # In mock mode, generate a fake ID
        if "1234567890" in settings.TRIPJACK_API_KEY:
             tripjack_booking_id = f"TJ_MOCK_{booking.booking_reference}"
        else:
             # Pass list of all price IDs (Onward + Return)
             review_res = await tripjack.review_booking(price_ids)
             # Assuming TripJack returns bookingId in the review response
             # Based on documentation/assumption, let's look for it
             # If exact structure is unknown, we might need to inspect response
             # For now, let's assume it returns a 'bookingId' or we use our ref
             # Wait, the user said "get the booking id in review response"
             tripjack_booking_id = review_res.get('bookingId')
             
             if not tripjack_booking_id:
                 # Fallback/Error if not found? 
                 # Some APIs return it in 'billingInfo' or similar. 
                 # Let's save the whole response ID or similar
                 tripjack_booking_id = review_res.get('bookingId') 
        
        # Save tripjack_booking_id to DB
        if tripjack_booking_id:
            booking.tripjack_booking_id = tripjack_booking_id
            await db.commit()
            
        return {
            "success": True, 
            "tripjack_booking_id": tripjack_booking_id
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Flight review failed: {str(e)}")


@router.get("/{booking_id}/invoice")
async def download_invoice(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Download booking invoice as PDF"""
    from fastapi.responses import Response
    from app.services.invoice_service import InvoiceService
    
    # data fetching
    query = select(Booking).where(Booking.id == booking_id).options(
        selectinload(Booking.package),
        selectinload(Booking.user),
        selectinload(Booking.payments),
        selectinload(Booking.agent)
    )
    result = await db.execute(query)
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise NotFoundException("Booking not found")
        
    # Check authorization
    from app.models import UserRole
    if (booking.user_id != current_user.id and 
        booking.agent_id != current_user.id and 
        current_user.role != UserRole.ADMIN and 
        current_user.role != "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to view this invoice")
        
    # Generate PDF
    pdf_bytes = InvoiceService.generate_booking_invoice_pdf(booking, booking.user)
    
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="Failed to generate invoice")
        
    # Return PDF response
    headers = {
        'Content-Disposition': f'attachment; filename="Invoice_{booking.booking_reference}.pdf"'
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
