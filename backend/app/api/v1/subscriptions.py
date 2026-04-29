from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID
import uuid
from datetime import date, timedelta

from app.database import get_db
from app.api.deps import get_current_active_user, get_current_active_superuser, check_permission
from app.models import User, SubscriptionPlan, Subscription, Invoice, Notification, Agent, UserRole
from app.schemas import (
    SubscriptionPlanCreate, SubscriptionPlanResponse,
    SubscriptionResponse, InvoiceResponse, SubscriptionPlanUpdate,
    SubscriptionPurchaseResponse, SubscriptionPaymentVerification,
    MessageResponse
)
from app.tasks.email_tasks import send_email_task

router = APIRouter()

# --- Admin Endpoints ---

@router.get("/plans", response_model=List[SubscriptionPlanResponse])
async def list_plans(
    db: AsyncSession = Depends(get_db),
    # Allow public access for now so users can see plans before registering/upgrading
):
    """List all subscription plans"""
    result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.is_active == True))
    plans = result.scalars().all()

    # Calculate Most Popular Plan
    from sqlalchemy import func
    stmt = select(Subscription.plan_id, func.count(Subscription.id)).group_by(Subscription.plan_id).order_by(func.count(Subscription.id).desc()).limit(1)
    popularity_result = await db.execute(stmt)
    most_popular_plan = popularity_result.first()
    
    most_popular_plan_id = most_popular_plan[0] if most_popular_plan else None

    # Convert to Pydantic models with is_popular flag
    response_plans = []
    for plan in plans:
        plan_data = SubscriptionPlanResponse.model_validate(plan)
        if most_popular_plan_id and plan.id == most_popular_plan_id:
            plan_data.is_popular = True
        response_plans.append(plan_data)
        
    return response_plans

@router.get("/admin/plans", response_model=List[SubscriptionPlanResponse])
async def list_admin_plans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """List all subscription plans (Active & Inactive) for Admin"""
    result = await db.execute(select(SubscriptionPlan).order_by(SubscriptionPlan.created_at.desc()))
    plans = result.scalars().all()
    return plans

@router.delete("/plans/{plan_id}")
async def delete_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """Delete a subscription plan (Admin only)"""
    # Check if plan exists
    result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found")

    if plan.is_active:
        raise HTTPException(status_code=400, detail="Cannot delete an active subscription plan. Deactivate it first.")

    # Check for active subscriptions to this plan
    result = await db.execute(select(Subscription).where(Subscription.plan_id == plan_id, Subscription.status == 'active'))
    active_subs = result.scalars().first()
    
    if active_subs:
        # If active subscriptions exist, soft delete/archive instead (set active=False)
        # But if the user explicitly wants to delete, we should likely block it or force it.
        # For now, let's just block deletion if active subs exist and tell admin to deactivate instead.
        raise HTTPException(status_code=400, detail="Cannot delete plan with active subscriptions. Deactivate it instead.")

    await db.delete(plan)
    await db.commit()
    return {"message": "Plan deleted successfully"}

@router.post("/plans", response_model=SubscriptionPlanResponse)
async def create_plan(
    plan: SubscriptionPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """Create a new subscription plan (Admin only)"""
    import json
    plan_data = plan.model_dump()
    # Manual serialization for JSON fields stored as Text
    if isinstance(plan_data.get('features'), list):
        plan_data['features'] = json.dumps(plan_data['features'])
        
    new_plan = SubscriptionPlan(**plan_data)
    
    # Sync with Razorpay
    try:
        from app.services.razorpay_service import RazorpayService
        rzp = RazorpayService()
        
        period = "monthly"
        interval = 1
        if plan.billing_cycle == 'yearly':
            period = "yearly"
        elif plan.billing_cycle == 'quarterly':
            period = "monthly"
            interval = 3
        elif plan.billing_cycle == 'daily':
            period = "daily"
            
        rzp_plan_data = {
            "period": period,
            "interval": interval,
            "item": {
                "name": plan.name,
                "amount": int(plan.price * 100),
                "currency": plan.currency,
                "description": f"{plan.billing_cycle} subscription for {plan.name}"
            }
        }
        
        # Only create if price > 0
        if plan.price > 0:
            plan_id_rzp = rzp.create_plan(rzp_plan_data)
            new_plan.razorpay_plan_id = plan_id_rzp
            
    except Exception as e:
        print(f"Warning: Failed to create Razorpay plan: {e}")
        # We don't block creation, but we should log it. 
        # In production this might be critical, but for now allow local creation.

    db.add(new_plan)
    await db.commit()
    await db.refresh(new_plan)
    return new_plan

@router.put("/plans/{plan_id}", response_model=SubscriptionPlanResponse)
async def update_plan(
    plan_id: UUID,
    plan_update: SubscriptionPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """Update a subscription plan (Admin only)"""
    import json
    
    # Check if plan exists
    result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id))
    db_plan = result.scalar_one_or_none()
    
    if not db_plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found")
        
    update_data = plan_update.model_dump(exclude_unset=True)
    
    # Manual serialization for JSON fields
    if 'features' in update_data and isinstance(update_data['features'], list):
        update_data['features'] = json.dumps(update_data['features'])
        
    for field, value in update_data.items():
        setattr(db_plan, field, value)
        
    db.add(db_plan)
    await db.commit()
    await db.refresh(db_plan)
    return db_plan

@router.get("/admin/subscriptions", response_model=List[SubscriptionResponse])
async def list_all_subscriptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """List all user subscriptions (Admin only)"""
    from sqlalchemy.orm import selectinload
    from datetime import date
    
    stmt = select(Subscription).options(
        selectinload(Subscription.plan),
        selectinload(Subscription.user)
    )
    result = await db.execute(stmt)
    subscriptions = result.scalars().all()
    
    # Auto-expire active subscriptions that have passed their end date
    updated = False
    today = date.today()
    for sub in subscriptions:
        if sub.status == 'active' and sub.end_date < today:
            sub.status = 'expired'
            db.add(sub)
            updated = True
            
    if updated:
        await db.commit()
        
    return subscriptions

class SubscriptionStatusUpdate(BaseModel):
    status: str

@router.patch("/admin/subscriptions/{subscription_id}/status", response_model=SubscriptionResponse)
async def update_subscription_status(
    subscription_id: UUID,
    update_data: SubscriptionStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """Update a subscription status (Admin only)"""
    from sqlalchemy.orm import selectinload
    from app.services.subscription_service import SubscriptionService
    from datetime import date
    
    stmt = select(Subscription).where(Subscription.id == subscription_id).options(
        selectinload(Subscription.plan),
        selectinload(Subscription.user)
    )
    result = await db.execute(stmt)
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    new_status = update_data.status
    valid_statuses = ['active', 'cancelled', 'expired', 'trial', 'completed', 'upcoming', 'on_hold']
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    # Special handling for activating a plan
    if new_status == 'active':
        # Check if plan is actually expired by date
        if subscription.end_date < date.today():
             raise HTTPException(status_code=400, detail="Cannot activate an expired plan. Please extend the end date or create a new subscription.")
        
        # Move any currently active plans to 'on_hold' to prevent multiple active plans
        stmt = select(Subscription).where(
            Subscription.user_id == subscription.user_id,
            Subscription.id != subscription.id,
            Subscription.status == 'active'
        )
        result = await db.execute(stmt)
        other_active_subs = result.scalars().all()
        for other_sub in other_active_subs:
            other_sub.status = 'on_hold'
            db.add(other_sub)

    subscription.status = new_status
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    return subscription

# --- User Endpoints ---

@router.get("/my-subscription", response_model=List[SubscriptionResponse])
async def get_my_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get current user's subscription history"""
    from sqlalchemy.orm import selectinload
    stmt = select(Subscription).where(
        Subscription.user_id == current_user.id
    ).options(selectinload(Subscription.plan)).order_by(Subscription.created_at.desc())
    
    result = await db.execute(stmt)
    subscriptions = result.scalars().all()
    return subscriptions


@router.post("/check-expiry")
async def check_subscription_expiry(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Called on every subscription page load.
    1. Checks if current active plan is expired.
    2. If expired → marks it complete, auto-activates next queued plan.
    3. Returns new state so frontend can show correct UI without a full reload.
    """
    from app.services.subscription_service import SubscriptionService
    from sqlalchemy.orm import selectinload

    # Capture current active plan name BEFORE expiry check (for the toast message)
    current_stmt = select(Subscription).where(
        Subscription.user_id == current_user.id,
        Subscription.status == 'active'
    ).options(selectinload(Subscription.plan))
    current_active_before = (await db.execute(current_stmt)).scalar_one_or_none()
    expired_plan_name = None
    was_expired = False

    if current_active_before:
        from datetime import date
        if current_active_before.end_date < date.today():
            expired_plan_name = current_active_before.plan.name
            was_expired = True

    # Run auto-activate logic (marks expired → completed, activates next queued)
    new_active = await SubscriptionService.check_and_auto_activate(current_user.id, db)

    auto_activated_plan = None
    if was_expired and new_active:
        auto_activated_plan = new_active.plan.name

    return {
        "was_expired": was_expired,
        "expired_plan_name": expired_plan_name,
        "auto_activated_plan": auto_activated_plan,
        "has_active_plan": new_active is not None,
        "new_active_sub": {
            "id": str(new_active.id),
            "plan_name": new_active.plan.name,
            "end_date": str(new_active.end_date),
            "status": new_active.status,
        } if new_active else None
    }


@router.post("/{subscription_id}/activate", response_model=SubscriptionResponse)
async def manual_activate_plan(
    subscription_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Manually activate an upcoming subscription"""
    from app.services.subscription_service import SubscriptionService
    
    try:
        activated_sub = await SubscriptionService.manual_activate_upcoming(current_user.id, subscription_id, db)
        return activated_sub
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upgrade", response_model=SubscriptionResponse)
async def upgrade_subscription(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("billing", "full")),
):
    """Upgrade or subscribe to a plan"""
    # Verify plan exists
    stmt = select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id)
    result = await db.execute(stmt)
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Determine start/end dates
    start_date = date.today()
    if plan.billing_cycle == 'yearly':
        end_date = start_date + timedelta(days=365)
    else:
        end_date = start_date + timedelta(days=30)

    # Cancel existing active subscription if any
    stmt = select(Subscription).where(
        Subscription.user_id == current_user.agent_id,
        Subscription.status == 'active'
    )
    result = await db.execute(stmt)
    existing_sub = result.scalar_one_or_none()
    
    if existing_sub:
        existing_sub.status = 'cancelled'

    # Create new subscription
    new_sub = Subscription(
        user_id=current_user.agent_id,
        plan_id=plan.id,
        status='active',
        start_date=start_date,
        end_date=end_date,
        current_bookings_usage=0,
        auto_renew=True
    )
    db.add(new_sub)
    
    # Generate Invoice (Simplified for now)
    new_invoice = Invoice(
        user_id=current_user.agent_id,
        subscription_id=new_sub.id,
        amount=plan.price,
        status='pending',
        issue_date=date.today(),
        due_date=date.today() + timedelta(days=7)
    )
    db.add(new_invoice)

    await db.commit()
    await db.refresh(new_sub)
    
    # Re-fetch with relationship
    from sqlalchemy.orm import selectinload
    stmt = select(Subscription).where(Subscription.id == new_sub.id).options(selectinload(Subscription.plan))
    result = await db.execute(stmt)
    return result.scalar_one()

@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_my_invoices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("billing", "view")),
):
    """List current user's invoices"""
    stmt = select(Invoice).where(Invoice.user_id == current_user.agent_id).order_by(Invoice.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/purchase", response_model=SubscriptionPurchaseResponse)
async def purchase_subscription(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("billing", "full")),
):
    """Initiate subscription purchase (Razorpay)"""
    import razorpay
    from app.config import settings
    from app.models import Payment, PaymentStatus
    
    # Verify plan
    result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Create pending subscription
    new_sub = Subscription(
        user_id=current_user.agent_id,
        plan_id=plan.id,
        status='pending_payment',
        start_date=date.today(),
        end_date=date.today() + timedelta(days=365 if plan.billing_cycle == 'yearly' else 30),
        current_bookings_usage=0
    )
    db.add(new_sub)
    await db.flush() # Get ID

    # Create Razorpay Subscription (Auto-Renewal)
    from app.services.razorpay_service import RazorpayService
    rzp = RazorpayService()
    
    # 1. Ensure Plan exists on Razorpay
    if not plan.razorpay_plan_id and plan.price > 0:
        # Lazy create
        try:
           period = "monthly"
           interval = 1
           if plan.billing_cycle == 'yearly':
               period = "yearly"
           elif plan.billing_cycle == 'quarterly':
               period = "monthly"
               interval = 3
           elif plan.billing_cycle == 'daily':
               period = "daily"

           rzp_plan_data = {
                "period": period,
                "interval": interval,
                "item": {
                    "name": plan.name,
                    "amount": int(plan.price * 100),
                    "currency": plan.currency,
                    "description": f"{plan.billing_cycle} subscription for {plan.name}"
                }
           }
           plan_id_rzp = rzp.create_plan(rzp_plan_data)
           plan.razorpay_plan_id = plan_id_rzp
           db.add(plan)
           await db.commit()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to sync plan with Razorpay: {str(e)}")

    # 2. Create Subscription
    subscription_id_rzp = None
    order_id = None
    key_id_to_return = settings.RAZORPAY_SUBSCRIPTION_KEY_ID
    
    # Mock Override
    if "mock" in settings.RAZORPAY_SUBSCRIPTION_KEY_ID or "1234567890" in settings.RAZORPAY_SUBSCRIPTION_KEY_ID:
         print("Using Mock Subscription Flow")
         import uuid
         subscription_id_rzp = f"sub_mock_{uuid.uuid4().hex[:14]}"
         key_id_to_return = "rzp_test_mock_123456"
    else:
         try:
            # Create actual subscription
            # Total count: 120 cycles (10 years)
            subscription_id_rzp = rzp.create_subscription(
                plan_id=plan.razorpay_plan_id,
                total_count=120,
                customer_notify=1,
                notes={
                    "user_id": str(current_user.agent_id),
                    "local_subscription_id": str(new_sub.id)
                }
            )
         except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create Razorpay subscription: {str(e)}")

    # 3. Update local subscription with Razorpay ID
    new_sub.razorpay_subscription_id = subscription_id_rzp
    db.add(new_sub)
    await db.commit()
    
    # Note: We don't create a Payment record here yet. Payment record is created when verify happens.

    from app.schemas import SubscriptionPurchaseResponse
    return SubscriptionPurchaseResponse(
        order_id=None, 
        amount=int(plan.price * 100), 
        currency="INR",
        key_id=key_id_to_return,
        subscription_id=new_sub.id,
        razorpay_subscription_id=subscription_id_rzp
    )

@router.post("/verify", response_model=MessageResponse)
async def verify_subscription_payment(
    verification_data: SubscriptionPaymentVerification,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_permission("billing", "full")),
):
    """Verify subscription payment and activate"""
    from app.schemas import SubscriptionPaymentVerification, MessageResponse
    from app.models import Payment, PaymentStatus
    from app.config import settings
    import razorpay

    # Verify signature
    client = razorpay.Client(auth=(settings.RAZORPAY_SUBSCRIPTION_KEY_ID, settings.RAZORPAY_SUBSCRIPTION_KEY_SECRET))
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Verifying payment: sub_id={verification_data.razorpay_subscription_id}, order_id={verification_data.razorpay_order_id}, payment_id={verification_data.razorpay_payment_id}")

    # Fetch Subscription first to get stored Razorpay IDs
    from sqlalchemy.orm import selectinload
    stmt = select(Subscription).where(Subscription.id == verification_data.subscription_id).options(selectinload(Subscription.plan))
    result = await db.execute(stmt)
    sub = result.scalar_one_or_none()
    
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    # Use stored subscription/order IDs if missing from request (improves robustness)
    rzp_subscription_id = verification_data.razorpay_subscription_id or sub.razorpay_subscription_id
    rzp_order_id = verification_data.razorpay_order_id # Orders aren't usually stored on the sub object itself yet

    # 1. Signature Verification
    try:
        # Check if it's a mock order
        if "sub_mock_" in (rzp_subscription_id or "") or "order_mock_" in (rzp_order_id or ""):
             # Skip Razorpay verification for mock
             logger.info("Skipping verification for mock payment")
             pass
        elif "1234567890" not in settings.RAZORPAY_SUBSCRIPTION_KEY_ID:
            # For Subscriptions: payment_id + | + subscription_id
            if rzp_subscription_id:
                import hmac
                import hashlib
                
                secret = settings.RAZORPAY_SUBSCRIPTION_KEY_SECRET
                msg = f"{verification_data.razorpay_payment_id}|{rzp_subscription_id}"
                
                print(f"DEBUG: Secret: {secret[:5]}...{secret[-2:]}")
                print(f"DEBUG: Msg: {msg}")
                print(f"DEBUG: Received Signature: {verification_data.razorpay_signature}")
                
                generated_signature = hmac.new(
                    bytes(secret, 'utf-8'),
                    bytes(msg, 'utf-8'),
                    digestmod=hashlib.sha256
                ).hexdigest()
                
                print(f"DEBUG: Generated Signature: {generated_signature}")
                
                if not hmac.compare_digest(generated_signature, verification_data.razorpay_signature):
                     msg_err = f"Subscription Signature mismatch. Generated: {generated_signature}, Received: {verification_data.razorpay_signature}"
                     logger.error(msg_err)
                     print(f"DEBUG: {msg_err}")
                     raise razorpay.errors.SignatureVerificationError(msg_err)
                     
            else:
                 # Fallback to order verification (standard payment flow)
                 if not rzp_order_id:
                      msg_err = "Missing both razorpay_subscription_id and razorpay_order_id. Cannot verify payment."
                      logger.error(msg_err)
                      raise HTTPException(status_code=400, detail=msg_err)

                 client.utility.verify_payment_signature({
                    'razorpay_order_id': rzp_order_id,
                    'razorpay_payment_id': verification_data.razorpay_payment_id,
                    'razorpay_signature': verification_data.razorpay_signature
                })
    except razorpay.errors.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail=str(e) or "Invalid payment signature")

    # Get Plan for Amount Validation
    stmt = select(SubscriptionPlan).where(SubscriptionPlan.id == sub.plan_id)
    result = await db.execute(stmt)
    plan = result.scalar_one()

    # 2. Secure Backend Verification (Fetch from Razorpay)
    # Only if not mock
    is_mock = "sub_mock_" in (verification_data.razorpay_subscription_id or "") or "order_mock_" in (verification_data.razorpay_order_id or "")
    
    if not is_mock and "1234567890" not in settings.RAZORPAY_SUBSCRIPTION_KEY_ID:
        try:
            # Fetch payment details from Razorpay
            fetched_payment = client.payment.fetch(verification_data.razorpay_payment_id)
            
            # A. Status Check
            if fetched_payment['status'] == 'authorized':
                # Manually capture the payment if it's only authorized
                logger.info(f"Payment {verification_data.razorpay_payment_id} is authorized, capturing now...")
                try:
                    capture_amount = fetched_payment['amount']
                    client.payment.capture(verification_data.razorpay_payment_id, capture_amount, {"currency": "INR"})
                    logger.info(f"Payment {verification_data.razorpay_payment_id} captured successfully")
                except Exception as e:
                    logger.error(f"Failed to capture payment: {e}")
                    raise HTTPException(status_code=400, detail=f"Failed to capture authorized payment: {str(e)}")
            elif fetched_payment['status'] != 'captured':
                 raise HTTPException(status_code=400, detail=f"Payment status is {fetched_payment['status']}, expected 'captured' or 'authorized'")
            
            # B. Amount Check
            expected_amount_paise = int(plan.price * 100)
            if fetched_payment['amount'] != expected_amount_paise:
                 raise HTTPException(
                     status_code=400, 
                     detail=f"Amount mismatch: Paid {fetched_payment['amount']/100}, Expected {plan.price}"
                 )
                 
            # C. Currency Check
            if fetched_payment['currency'] != 'INR':
                raise HTTPException(status_code=400, detail="Invalid currency")

        except Exception as e:
             print(f"Payment Verification Failed: {str(e)}")
             raise HTTPException(status_code=400, detail=f"Payment Verification Failed: {str(e)}")

    # 3. Create Payment Record (since purchase didn't create one for subscription flow)
    # Check if payment already exists (idempotency)
    stmt = select(Payment).where(Payment.razorpay_payment_id == verification_data.razorpay_payment_id)
    result = await db.execute(stmt)
    existing_payment = result.scalar_one_or_none()
    
    if existing_payment:
        # Already processed
        pass
    else:
        # Create new payment record
        payment = Payment(
            subscription_id=sub.id,
            razorpay_payment_id=verification_data.razorpay_payment_id,
            razorpay_order_id=verification_data.razorpay_order_id, # Might be None for subscriptions
            razorpay_signature=verification_data.razorpay_signature,
            amount=plan.price,
            currency="INR",
            status=PaymentStatus.SUCCEEDED
        )
        db.add(payment)

    # 4. Handle Activation
    from app.services.subscription_service import SubscriptionService
    await SubscriptionService.handle_purchase_activation(sub.user_id, sub, db)

    # 5. Create Invoice
    new_invoice = Invoice(
        user_id=current_user.id,
        subscription_id=sub.id,
        amount=plan.price,
        status='paid',
        issue_date=date.today(),
        due_date=date.today()
    )
    db.add(new_invoice)
    
    await db.commit()
    
    status_msg = "activated" if sub.status == 'active' else "queued as upcoming"
    return MessageResponse(message=f"Subscription verified and {status_msg}")

@router.post("/{subscription_id}/cancel-request", response_model=MessageResponse)
async def request_subscription_cancellation(
    subscription_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Request cancellation of a subscription.
    This does NOT cancel the subscription immediately.
    It notifies all admins via email and in-portal notifications.
    """
    from sqlalchemy.orm import selectinload
    
    # 1. Verify subscription exists and belongs to user
    stmt = select(Subscription).where(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.agent_id
    ).options(selectinload(Subscription.plan))
    result = await db.execute(stmt)
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found or not active")
        
    # 2. Get Agent details for the notification
    stmt = select(Agent).where(Agent.user_id == current_user.agent_id)
    result = await db.execute(stmt)
    agent = result.scalar_one_or_none()
    agency_name = agent.agency_name if agent else "Unknown Agency"
    
    # 3. Find all Admins to notify
    stmt = select(User).where(User.role == UserRole.ADMIN, User.is_active == True)
    result = await db.execute(stmt)
    admins = result.scalars().all()
    
    if not admins:
        # Fallback if no admins found (unlikely in prod)
        print("Warning: No active admins found to notify about subscription cancellation")
        
    # 4. Create Notifications and Send Emails
    for admin in admins:
        # In-portal notification
        notification = Notification(
            user_id=admin.id,
            type="warning",
            title="Subscription Cancellation Request",
            message=f"Agent '{agency_name}' ({current_user.email}) has requested to cancel their '{subscription.plan.name}' subscription."
        )
        db.add(notification)
        
        # Email notification
        subject = f"Cancellation Request: {agency_name}"
        html_body = f"""
        <div style="font-family: sans-serif; padding: 20px; color: #1a202c;">
            <h2 style="color: #e53e3e;">Subscription Cancellation Request</h2>
            <p>Hello {admin.first_name or 'Admin'},</p>
            <p>An agent has requested to cancel their subscription. Please review this request in the admin portal.</p>
            
            <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #edf2f7;">
                <p style="margin: 5px 0;"><strong>Agency:</strong> {agency_name}</p>
                <p style="margin: 5px 0;"><strong>Agent Email:</strong> {current_user.email}</p>
                <p style="margin: 5px 0;"><strong>Current Plan:</strong> {subscription.plan.name}</p>
                <p style="margin: 5px 0;"><strong>Expiry Date:</strong> {subscription.end_date}</p>
            </div>
            
            <p>Please contact the agent to understand their reasons or process the cancellation manually if required.</p>
            
            <hr style="border: none; border-top: 1px solid #edf2f7; margin: 20px 0;" />
            <p style="font-size: 12px; color: #718096;">This is an automated notification from the Tour SaaS Platform.</p>
        </div>
        """
        
        # Trigger async email task
        send_email_task.delay(
            to_email=admin.email,
            subject=subject,
            html_body=html_body
        )

    await db.commit()
    
    return MessageResponse(message="Cancellation request sent to administrators. They will contact you shortly.")
