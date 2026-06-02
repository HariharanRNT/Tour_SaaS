"""Public review API endpoints (no auth required — token-based)"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional

from app.database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Request / Response Schemas ──────────────────────────────────────────────

class ReviewSubmitRequest(BaseModel):
    token: str = Field(..., description="Secure review token from email link")
    rating: int = Field(..., ge=1, le=5, description="Star rating 1-5")
    message: Optional[str] = Field(None, max_length=1000, description="Optional review message")


class ReviewTokenValidateResponse(BaseModel):
    booking_id: str
    booking_reference: str
    package_name: str
    agency_name: str
    already_submitted: bool
    existing_rating: Optional[int] = None
    existing_message: Optional[str] = None


class ReviewSubmitResponse(BaseModel):
    id: str
    booking_id: str
    rating: int
    review_message: Optional[str]
    submitted_at: Optional[str]
    message: str = "Review submitted successfully! Thank you for your feedback."


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/validate/{token}", response_model=ReviewTokenValidateResponse)
async def validate_review_token(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Validates a review token and returns booking context.
    Called by the frontend to pre-fill the review form.
    No authentication required.
    """
    from app.services.review_service import get_review_token_info

    try:
        info = await get_review_token_info(token, db)
        return info
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error validating review token: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate review link"
        )


@router.post("/submit", response_model=ReviewSubmitResponse)
async def submit_review(
    payload: ReviewSubmitRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a customer review for a booking.
    Validates the token, prevents duplicate submissions, saves the review,
    and updates booking status to SUBMITTED.
    No authentication required — token acts as identity proof.
    """
    from app.services.review_service import submit_review as svc_submit_review

    try:
        result = await svc_submit_review(
            token=payload.token,
            rating=payload.rating,
            message=payload.message,
            db=db
        )
        return {
            **result,
            "message": "Review submitted successfully! Thank you for your feedback."
        }
    except ValueError as e:
        err_msg = str(e)
        # Map specific errors to appropriate HTTP status codes
        if "already been submitted" in err_msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=err_msg)
        elif "expired" in err_msg:
            raise HTTPException(status_code=status.HTTP_410_GONE, detail=err_msg)
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
    except Exception as e:
        logger.error(f"Error submitting review: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit review. Please try again."
        )
