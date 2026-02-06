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
    return plans

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

    # Create Razorpay Order
    client = razorpay.Client(auth=(settings.RAZORPAY_SUBSCRIPTION_KEY_ID, settings.RAZORPAY_SUBSCRIPTION_KEY_SECRET))
    amount_in_paise = int(plan.price * 100)
    
    order_data = {
        "amount": amount_in_paise,
        "currency": "INR",
        "receipt": str(new_sub.id),
        "notes": {
            "subscription_id": str(new_sub.id),
            "user_id": str(current_user.id),
            "plan_id": str(plan.id)
        }
    }
    
    # Mock Mode Logic: Use mock if key explicitly indicates mock/test environment default
    use_mock = "1234567890" in settings.RAZORPAY_SUBSCRIPTION_KEY_ID or "mock" in settings.RAZORPAY_SUBSCRIPTION_KEY_ID.lower()
    
    # Check if user wants to force mock via a query param or similar (optional, but good for testing)
    # For now, we rely on the key.
    
    key_id_to_return = settings.RAZORPAY_SUBSCRIPTION_KEY_ID
    mock_key_id = "rzp_test_mock_123456" 

    try:
        if use_mock:
            print("Using Mock Mode due to default/mock key detection.")
            raise Exception("Force Mock")
            
        print(f"Attempting Razorpay Order with Key: {settings.RAZORPAY_SUBSCRIPTION_KEY_ID[:8]}...")
        order = client.order.create(data=order_data)
        print(f"Razorpay Order Created: {order['id']}")
        
    except Exception as e:
        print(f"Razorpay Order Creation Failed: {str(e)}")
        
        # If it wasn't a forced mock, this is a real error we should probably let the user know about
        # causing a 500 or 400. But if we want to fallback to mock for development robustness:
        if not use_mock and settings.APP_ENV == "production":
            # In production, do not silent fallback. Raise error.
            raise HTTPException(status_code=500, detail=f"Payment Gateway Error: {str(e)}")
            
        # In dev, fallback to mock with a warning log
        print("Falling back to Mock Order due to error or mock configuration.")
        import uuid
        order = {
            "id": f"order_mock_{uuid.uuid4().hex[:14]}",
            "amount": amount_in_paise,
            "currency": "INR",
            "status": "created"
        }
        key_id_to_return = mock_key_id

    # Create Payment Record
    payment = Payment(
        subscription_id=new_sub.id,
        razorpay_order_id=order['id'],
        amount=plan.price,
        currency="INR",
        status=PaymentStatus.PENDING
    )
    db.add(payment)
    await db.commit()

    from app.schemas import SubscriptionPurchaseResponse
    return SubscriptionPurchaseResponse(
        order_id=order['id'],
        amount=order['amount'],
        currency=order['currency'],
        key_id=key_id_to_return,
        subscription_id=new_sub.id
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
    
    # 1. Signature Verification
    try:
        # Check if it's a mock order
        if "order_mock_" in verification_data.razorpay_order_id:
             # Skip Razorpay verification for mock orders
             pass
        elif "1234567890" not in settings.RAZORPAY_SUBSCRIPTION_KEY_ID:
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
    if "order_mock_" not in verification_data.razorpay_order_id and "1234567890" not in settings.RAZORPAY_SUBSCRIPTION_KEY_ID:
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

    # Update Payment Record
    stmt = select(Payment).where(Payment.razorpay_order_id == verification_data.razorpay_order_id)
    result = await db.execute(stmt)
    payment = result.scalar_one_or_none()

    if payment:
        payment.status = PaymentStatus.SUCCEEDED
        payment.razorpay_payment_id = verification_data.razorpay_payment_id
        payment.razorpay_signature = verification_data.razorpay_signature

    # Handle Activation via Service (Queuing vs Immediate)
    from app.services.subscription_service import SubscriptionService
    await SubscriptionService.handle_purchase_activation(sub.user_id, sub, db)

    # Create Invoice
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
