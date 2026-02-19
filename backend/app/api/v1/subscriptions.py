from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID
import uuid
from datetime import date, timedelta

from app.database import get_db
from app.api.deps import get_current_active_user, get_current_active_superuser
from app.models import User, SubscriptionPlan, Subscription, Invoice, Notification
from app.schemas import (
    SubscriptionPlanCreate, SubscriptionPlanResponse,
    SubscriptionResponse, InvoiceResponse, SubscriptionPlanUpdate,
    SubscriptionPurchaseResponse, SubscriptionPaymentVerification,
    MessageResponse
)

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
    stmt = select(Subscription).options(selectinload(Subscription.plan))
    result = await db.execute(stmt)
    subscriptions = result.scalars().all()
    return subscriptions

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
    current_user: User = Depends(get_current_active_user),
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
        Subscription.user_id == current_user.id,
        Subscription.status == 'active'
    )
    result = await db.execute(stmt)
    existing_sub = result.scalar_one_or_none()
    
    if existing_sub:
        existing_sub.status = 'cancelled'

    # Create new subscription
    new_sub = Subscription(
        user_id=current_user.id,
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
        user_id=current_user.id,
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
    current_user: User = Depends(get_current_active_user),
):
    """List current user's invoices"""
    stmt = select(Invoice).where(Invoice.user_id == current_user.id).order_by(Invoice.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/purchase", response_model=SubscriptionPurchaseResponse)
async def purchase_subscription(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
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
        user_id=current_user.id,
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
                    "user_id": str(current_user.id),
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
    current_user: User = Depends(get_current_active_user),
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

    # 1. Signature Verification
    try:
        # Check if it's a mock order
        if "sub_mock_" in (verification_data.razorpay_subscription_id or "") or "order_mock_" in (verification_data.razorpay_order_id or ""):
             # Skip Razorpay verification for mock
             logger.info("Skipping verification for mock payment")
             pass
        elif "1234567890" not in settings.RAZORPAY_SUBSCRIPTION_KEY_ID:
            # For Subscriptions: payment_id + | + subscription_id
            if verification_data.razorpay_subscription_id:
                import hmac
                import hashlib
                
                secret = settings.RAZORPAY_SUBSCRIPTION_KEY_SECRET
                msg = f"{verification_data.razorpay_payment_id}|{verification_data.razorpay_subscription_id}"
                
                generated_signature = hmac.new(
                    bytes(secret, 'utf-8'),
                    bytes(msg, 'utf-8'),
                    hashlib.sha256
                ).hexdigest()
                
                if not hmac.compare_digest(generated_signature, verification_data.razorpay_signature):
                     msg = f"Signature mismatch. Generated: {generated_signature}, Received: {verification_data.razorpay_signature}"
                     logger.error(msg)
                     print(f"DEBUG: {msg}")
                     raise razorpay.errors.SignatureVerificationError("Invalid payment signature")
                     
            else:
                 # Fallback to order verification (old flow)
                 if not verification_data.razorpay_order_id:
                      msg = "Missing order_id for manual verification fallback"
                      logger.error(msg)
                      print(f"DEBUG: {msg}")
                      raise HTTPException(status_code=400, detail="Missing razorpay_order_id. Cannot verify payment.")

                 client.utility.verify_payment_signature({
                    'razorpay_order_id': verification_data.razorpay_order_id,
                    'razorpay_payment_id': verification_data.razorpay_payment_id,
                    'razorpay_signature': verification_data.razorpay_signature
                })
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    # Get Subscription
    from sqlalchemy.orm import selectinload
    stmt = select(Subscription).where(Subscription.id == verification_data.subscription_id).options(selectinload(Subscription.plan))
    result = await db.execute(stmt)
    sub = result.scalar_one_or_none()
    
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

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
            if fetched_payment['status'] != 'captured':
                 raise HTTPException(status_code=400, detail=f"Payment status is {fetched_payment['status']}, expected 'captured'")
            
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
