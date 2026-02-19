from fastapi import APIRouter, Request, HTTPException, Depends, Header
from app.config import settings
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.subscription_service import SubscriptionService
import razorpay
import hmac
import hashlib
import json

router = APIRouter()

@router.post("/razorpay")
async def handle_razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Handle Razorpay Webhooks (Subscription Charged, etc.)
    """
    if not x_razorpay_signature:
        raise HTTPException(status_code=400, detail="Missing Signature")

    body_bytes = await request.body()
    body_str = body_bytes.decode('utf-8')
    
    # metrics log
    print(f"Webhook Received: {body_str[:100]}...")

    # Verify Signature
    try:
        client = razorpay.Client(auth=(settings.RAZORPAY_SUBSCRIPTION_KEY_ID, settings.RAZORPAY_SUBSCRIPTION_KEY_SECRET))
        client.utility.verify_webhook_signature(body_str, x_razorpay_signature, settings.RAZORPAY_WEBHOOK_SECRET)
    except Exception as e:
        print(f"Webhook Signature Verification Failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid Signature")

    try:
        event = json.loads(body_str)
        event_type = event.get('event')
        
        print(f"Processing Event: {event_type}")

        if event_type == 'subscription.charged':
            await SubscriptionService.handle_subscription_charged(event['payload'], db)
        
        elif event_type == 'subscription.halted':
            # Handle halted (payment failed multiple times)
            pass
            
        elif event_type == 'subscription.cancelled':
            # Handle cancellation
            pass
            
        return {"status": "ok"}
        
    except Exception as e:
        print(f"Webhook Processing Error: {e}")
        import traceback
        print(traceback.format_exc())
        return {"status": "error", "detail": str(e)} # Return 200/ok to Razorpay to avoid retries on logic error?
        # Usually webhooks expect 200. If we return 500, they retry.
        # If logic fails, we probably want to inspect logs, NOT endless retry if strict bug.
