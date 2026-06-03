"""
Review Service
Handles token generation, validation, email sending, and review submission for the customer review system.
"""
import logging
import hashlib
import hmac
import json
import base64
import time
from datetime import datetime, timezone
from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.config import settings
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Token expiry: 30 days in seconds
REVIEW_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60


# ─── Token Utilities ──────────────────────────────────────────────────────────

def _get_signing_key() -> str:
    """Returns the secret used for signing review tokens."""
    return f"{settings.SECRET_KEY}-review-token"


def generate_review_token(booking_id: str, agent_id: str) -> str:
    """
    Generates a secure, time-limited review token.
    Format: base64url(json_payload) + "." + HMAC_signature
    """
    payload = {
        "booking_id": str(booking_id),
        "agent_id": str(agent_id),
        "exp": int(time.time()) + REVIEW_TOKEN_EXPIRY_SECONDS,
        "iat": int(time.time()),
    }
    payload_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip('=')

    key = _get_signing_key().encode('utf-8')
    sig = hmac.new(key, payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()

    return f"{payload_b64}.{sig}"


def validate_review_token(token: str) -> Tuple[str, str]:
    """
    Validates a review token and returns (booking_id, agent_id).
    Raises ValueError if the token is invalid or expired.
    """
    if not token or '.' not in token:
        raise ValueError("Invalid token format")

    parts = token.rsplit('.', 1)
    if len(parts) != 2:
        raise ValueError("Invalid token format")

    payload_b64, sig = parts

    # Verify HMAC signature
    key = _get_signing_key().encode('utf-8')
    expected_sig = hmac.new(key, payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise ValueError("Token signature is invalid")

    # Decode payload
    try:
        # Add padding back
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))
    except Exception:
        raise ValueError("Token payload is malformed")

    # Check expiry
    if payload.get('exp', 0) < int(time.time()):
        raise ValueError("Review link has expired. Please ask the agent to resend the review form.")

    booking_id = payload.get('booking_id')
    agent_id = payload.get('agent_id')

    if not booking_id or not agent_id:
        raise ValueError("Token is missing required fields")

    return booking_id, agent_id


# ─── Email ───────────────────────────────────────────────────────────────────

async def send_review_email(booking, agent_user, db: AsyncSession):
    """
    Sends the review request email to the customer.
    Generates/refreshes the review token, saves it, then dispatches the email.
    """
    from app.models import ReviewStatus
    from app.services.customer_notification_service import CustomerNotificationService

    # Generate a fresh token
    token = generate_review_token(str(booking.id), str(booking.agent_id))

    # Save token + update review_status to SENT
    booking.review_token = token
    booking.review_status = ReviewStatus.SENT
    booking.review_sent_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(booking)

    # Build the review URL pointing to the customer portal
    customer_portal_url = _get_customer_portal_url(agent_user)
    review_url = f"{customer_portal_url}/bookings?review={token}"

    # Resolve recipient email from booking.user
    recipient_email = None
    customer_name = "Valued Traveler"
    if booking.user:
        recipient_email = booking.user.email
        fn = getattr(booking.user, 'first_name', '') or ''
        ln = getattr(booking.user, 'last_name', '') or ''
        customer_name = f"{fn} {ln}".strip() or "Valued Traveler"

    if not recipient_email:
        logger.warning(f"Cannot send review email for booking {booking.id}: no recipient email")
        return

    package_name = booking.package.title if booking.package else "Your Trip"
    data = {
        "customer_name": customer_name,
        "package_name": package_name,
        "reference_id": booking.booking_reference,
        "booking_reference": booking.booking_reference,
        "review_url": review_url,
        "agency_name": CustomerNotificationService.get_agency_name(agent_user),
    }

    await CustomerNotificationService._send_notification(
        recipient_email,
        "review_request",
        data,
        agent_user,
        attachments=None,
        booking_id=str(booking.id)
    )
    logger.info(f"Review email sent for booking {booking.booking_reference} to {recipient_email}")


def _get_customer_portal_url(agent_user) -> str:
    """Returns the customer portal base URL for an agent."""
    try:
        if agent_user and agent_user.agent_profile and agent_user.agent_profile.domain:
            domain = agent_user.agent_profile.domain
            # Detect if in production vs development
            if settings.APP_ENV == "production":
                return f"https://{domain}"
            else:
                # Append port 3000 for local development
                return f"http://{domain}:3000"
    except Exception:
        pass
    return settings.FRONTEND_URL


# ─── Review Submission ────────────────────────────────────────────────────────

async def submit_review(
    token: str,
    rating: int,
    message: Optional[str],
    db: AsyncSession
) -> dict:
    """
    Validates token, checks for duplicate, saves BookingReview, updates Booking status,
    and recalculates package rating aggregates.
    Returns the saved review info dict.
    """
    from app.models import Booking, BookingReview, ReviewStatus, BookingStatus
    from sqlalchemy.orm import selectinload

    # 1. Validate token
    booking_id, agent_id = validate_review_token(token)

    # 2. Load booking with package relationship
    stmt = select(Booking).where(
        Booking.id == UUID(booking_id)
    ).options(selectinload(Booking.package))
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()

    if not booking:
        raise ValueError("Booking not found")

    if booking.status not in [BookingStatus.COMPLETED, BookingStatus.CONFIRMED]:
        raise ValueError("Reviews can only be submitted for confirmed or completed bookings")

    # 3. Check for duplicate review
    existing_stmt = select(BookingReview).where(BookingReview.booking_id == booking.id)
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing:
        raise ValueError("A review has already been submitted for this booking")

    # 4. Validate rating
    if not 1 <= rating <= 5:
        raise ValueError("Rating must be between 1 and 5")

    # 5. Validate message length
    if message and len(message) > 1000:
        raise ValueError("Review message must not exceed 1000 characters")

    # 6. Save review
    review = BookingReview(
        booking_id=booking.id,
        package_id=booking.package_id,
        agent_id=booking.agent_id,
        customer_id=booking.user_id,
        rating=rating,
        review_message=message.strip() if message else None,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(review)

    # 7. Update booking review_status
    booking.review_status = ReviewStatus.SUBMITTED
    booking.review_submitted_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(review)

    # 8. Recalculate package rating aggregates
    if booking.package_id:
        await update_package_rating(booking.package_id, db)

    return {
        "id": str(review.id),
        "booking_id": str(review.booking_id),
        "rating": review.rating,
        "review_message": review.review_message,
        "submitted_at": review.submitted_at.isoformat() if review.submitted_at else None,
    }


async def update_package_rating(package_id, db: AsyncSession):
    """
    Recalculates and saves the denormalized average_rating and review_count for a package.
    """
    from app.models import BookingReview, Package

    # Aggregate all reviews for this package
    stmt = select(
        func.avg(BookingReview.rating).label("avg_rating"),
        func.count(BookingReview.id).label("count")
    ).where(BookingReview.package_id == package_id)

    result = await db.execute(stmt)
    row = result.one_or_none()

    avg_rating = float(row.avg_rating) if row and row.avg_rating else None
    count = int(row.count) if row else 0

    # Round to 1 decimal
    if avg_rating is not None:
        avg_rating = round(avg_rating, 1)

    # Update the package record
    await db.execute(
        update(Package)
        .where(Package.id == package_id)
        .values(average_rating=avg_rating, review_count=count)
    )
    await db.commit()
    logger.info(f"Updated package {package_id} ratings: avg={avg_rating}, count={count}")


# ─── Token Validate Info ──────────────────────────────────────────────────────

async def get_review_token_info(token: str, db: AsyncSession) -> dict:
    """
    Validates a token and returns booking context for pre-filling the review form.
    Used by the frontend to show booking info before submitting.
    """
    from app.models import Booking, BookingReview, ReviewStatus
    from sqlalchemy.orm import selectinload

    booking_id, agent_id = validate_review_token(token)

    stmt = select(Booking).where(
        Booking.id == UUID(booking_id)
    ).options(selectinload(Booking.package), selectinload(Booking.agent))
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()

    if not booking:
        raise ValueError("Booking not found")

    # Check if already submitted
    existing_stmt = select(BookingReview).where(BookingReview.booking_id == booking.id)
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    already_submitted = existing is not None

    # Agency name
    agency_name = ""
    try:
        if booking.agent and booking.agent.agent_profile:
            agency_name = booking.agent.agent_profile.agency_name or ""
    except Exception:
        pass

    return {
        "booking_id": str(booking.id),
        "booking_reference": booking.booking_reference,
        "package_name": booking.package.title if booking.package else "Your Trip",
        "agency_name": agency_name,
        "already_submitted": already_submitted,
        "existing_rating": existing.rating if existing else None,
        "existing_message": existing.review_message if existing else None,
    }
