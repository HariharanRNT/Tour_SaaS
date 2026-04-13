from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract, case, desc, asc, text
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models import Subscription, SubscriptionPlan, Booking, Package, User, Agent, Payment, PaymentStatus, BookingStatus, Enquiry
from app.api.deps import get_current_admin

router = APIRouter()

# ==================== SUBSCRIPTION REPORTS ====================

@router.get("/subscriptions/summary")
async def get_subscription_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get subscription summary statistics"""
    query = select(func.count(Subscription.id))
    
    if start_date:
        query = query.filter(Subscription.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Subscription.created_at <= datetime.fromisoformat(end_date))
    
    total = (await db.execute(query)).scalar() or 0

    active = (await db.execute(
        query.filter(Subscription.status == 'active')
    )).scalar() or 0

    completed = (await db.execute(
        query.filter(Subscription.status == 'expired')
    )).scalar() or 0
    
    upcoming = (await db.execute(
        query.filter(Subscription.status == 'pending_payment')
    )).scalar() or 0
    
    paused = 0 
    
    cancelled = (await db.execute(
        query.filter(Subscription.status == 'cancelled')
    )).scalar() or 0
    
    return {
        "total": total,
        "active": active,
        "completed": completed,
        "upcoming": upcoming,
        "paused": paused,
        "cancelled": cancelled
    }

@router.get("/subscriptions/trends")
async def get_subscription_trends(
    period: str = Query("month", regex="^(month|year)$"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get month-wise or year-wise subscription trends"""
    if period == "month":
        year_col = extract('year', Subscription.created_at).label('year')
        month_col = extract('month', Subscription.created_at).label('month')
        count_col = func.count(Subscription.id).label('count')
        
        stmt = select(year_col, month_col, count_col)
        
        if start_date:
            stmt = stmt.filter(Subscription.created_at >= datetime.fromisoformat(start_date))
        if end_date:
            stmt = stmt.filter(Subscription.created_at <= datetime.fromisoformat(end_date))
            
        stmt = stmt.group_by(year_col, month_col)\
            .order_by(year_col, month_col)\
            .limit(12)
        
        result = await db.execute(stmt)
        trends = result.all()
        
        return [
            {
                "period": f"{int(t.year)}-{int(t.month):02d}",
                "count": t.count
            }
            for t in trends
        ]
    else:
        year_col = extract('year', Subscription.created_at).label('year')
        count_col = func.count(Subscription.id).label('count')
        
        stmt = select(year_col, count_col)
        
        if start_date:
            stmt = stmt.filter(Subscription.created_at >= datetime.fromisoformat(start_date))
        if end_date:
            stmt = stmt.filter(Subscription.created_at <= datetime.fromisoformat(end_date))
            
        stmt = stmt.group_by(year_col)\
            .order_by(year_col)
        
        result = await db.execute(stmt)
        trends = result.all()
        
        return [
            {
                "period": str(int(t.year)),
                "count": t.count
            }
            for t in trends
        ]

@router.get("/subscriptions/plans")
async def get_plan_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get plan-wise subscription analytics"""
    stmt = select(
        SubscriptionPlan.id,
        SubscriptionPlan.name,
        func.count(Subscription.id).label('subscription_count'),
        func.sum(SubscriptionPlan.price).label('total_revenue')
    ).join(Subscription, Subscription.plan_id == SubscriptionPlan.id)

    if start_date:
        stmt = stmt.filter(Subscription.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        stmt = stmt.filter(Subscription.created_at <= datetime.fromisoformat(end_date))
        
    stmt = stmt.group_by(SubscriptionPlan.id, SubscriptionPlan.name)
     
    result = await db.execute(stmt)
    plan_stats = result.all()
    
    plans = [
        {
            "plan_id": p.id,
            "plan_name": p.name,
            "subscription_count": p.subscription_count or 0,
            "total_revenue": float(p.total_revenue or 0)
        }
        for p in plan_stats
    ]
    
    most_purchased = max(plans, key=lambda x: x['subscription_count']) if plans else None
    least_purchased = min(plans, key=lambda x: x['subscription_count']) if plans else None
    
    return {
        "plans": plans,
        "most_purchased": most_purchased,
        "least_purchased": least_purchased
    }

@router.get("/subscriptions/renewals")
async def get_renewal_stats(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get subscription renewal vs cancellation statistics"""
    base_query = select(func.count(Subscription.id))
    if start_date:
        base_query = base_query.filter(Subscription.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        base_query = base_query.filter(Subscription.created_at <= datetime.fromisoformat(end_date))

    total = (await db.execute(base_query)).scalar() or 0
    renewals = (await db.execute(
        base_query.filter(Subscription.status == 'active')
    )).scalar() or 0
    cancellations = (await db.execute(
        base_query.filter(Subscription.status == 'cancelled')
    )).scalar() or 0
    
    return {
        "total": total,
        "renewals": renewals,
        "cancellations": cancellations,
        "renewal_rate": round((renewals / total * 100), 2) if total > 0 else 0,
        "cancellation_rate": round((cancellations / total * 100), 2) if total > 0 else 0
    }

# ==================== REVENUE REPORTS ====================

@router.get("/revenue/summary")
async def get_revenue_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get total revenue summary"""
    stmt = select(func.sum(SubscriptionPlan.price))\
        .join(Subscription, Subscription.plan_id == SubscriptionPlan.id)
    
    if start_date:
        stmt = stmt.filter(Subscription.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        stmt = stmt.filter(Subscription.created_at <= datetime.fromisoformat(end_date))
    
    total_revenue = (await db.execute(stmt)).scalar() or 0
    
    return {
        "total_revenue": float(total_revenue)
    }

@router.get("/revenue/trends")
async def get_revenue_trends(
    period: str = Query("month", regex="^(month|year)$"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get month-wise or year-wise revenue trends"""
    if period == "month":
        year_col = extract('year', Subscription.created_at).label('year')
        month_col = extract('month', Subscription.created_at).label('month')
        revenue_col = func.sum(SubscriptionPlan.price).label('revenue')
        
        stmt = select(year_col, month_col, revenue_col)\
            .join(SubscriptionPlan, Subscription.plan_id == SubscriptionPlan.id)

        if start_date:
            stmt = stmt.filter(Subscription.created_at >= datetime.fromisoformat(start_date))
        if end_date:
            stmt = stmt.filter(Subscription.created_at <= datetime.fromisoformat(end_date))
            
        stmt = stmt.group_by(year_col, month_col)\
            .order_by(year_col, month_col)\
            .limit(12)
        
        result = await db.execute(stmt)
        trends = result.all()
        
        return [
            {
                "period": f"{int(t.year)}-{int(t.month):02d}",
                "revenue": float(t.revenue or 0)
            }
            for t in trends
        ]
    else:
        year_col = extract('year', Subscription.created_at).label('year')
        revenue_col = func.sum(SubscriptionPlan.price).label('revenue')
        
        stmt = select(year_col, revenue_col)\
            .join(SubscriptionPlan, Subscription.plan_id == SubscriptionPlan.id)

        if start_date:
            stmt = stmt.filter(Subscription.created_at >= datetime.fromisoformat(start_date))
        if end_date:
            stmt = stmt.filter(Subscription.created_at <= datetime.fromisoformat(end_date))
            
        stmt = stmt.group_by(year_col)\
            .order_by(year_col)
        
        result = await db.execute(stmt)
        trends = result.all()
        
        return [
            {
                "period": str(int(t.year)),
                "revenue": float(t.revenue or 0)
            }
            for t in trends
        ]

@router.get("/revenue/by-agent")
async def get_revenue_by_agent(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get revenue generated by each agent"""
    stmt = select(
        Agent.id,
        Agent.first_name,
        Agent.last_name,
        User.email,
        func.count(Subscription.id).label('subscription_count'),
        func.sum(SubscriptionPlan.price).label('total_revenue')
    ).join(Subscription, Subscription.user_id == Agent.user_id)\
     .join(User, User.id == Agent.user_id)\
     .join(SubscriptionPlan, Subscription.plan_id == SubscriptionPlan.id)

    if start_date:
        stmt = stmt.filter(Subscription.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        stmt = stmt.filter(Subscription.created_at <= datetime.fromisoformat(end_date))
        
    stmt = stmt.group_by(Agent.id, Agent.first_name, Agent.last_name, User.email)
     
    result = await db.execute(stmt)
    agent_revenue = result.all()
    
    return [
        {
            "agent_id": a.id,
            "agent_name": f"{a.first_name} {a.last_name}",
            "email": a.email,
            "subscription_count": a.subscription_count,
            "total_revenue": float(a.total_revenue or 0)
        }
        for a in agent_revenue
    ]

@router.get("/revenue/by-plan")
async def get_revenue_by_plan(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get revenue share by subscription plan"""
    stmt = select(
        SubscriptionPlan.id,
        SubscriptionPlan.name,
        SubscriptionPlan.price,
        func.count(Subscription.id).label('subscription_count'),
        func.sum(SubscriptionPlan.price).label('total_revenue')
    ).join(Subscription, Subscription.plan_id == SubscriptionPlan.id)

    if start_date:
        stmt = stmt.filter(Subscription.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        stmt = stmt.filter(Subscription.created_at <= datetime.fromisoformat(end_date))
    
    stmt = stmt.group_by(SubscriptionPlan.id, SubscriptionPlan.name, SubscriptionPlan.price)
    
    result = await db.execute(stmt)
    plan_revenue = result.all()
    
    return [
        {
            "plan_id": p.id,
            "plan_name": p.name,
            "price": float(p.price),
            "subscription_count": p.subscription_count,
            "total_revenue": float(p.total_revenue or 0)
        }
        for p in plan_revenue
    ]

@router.get("/revenue/payment-status")
async def get_payment_status_breakdown(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get payment status breakdown"""
    stmt = select(
        Payment.status,
        func.count(Payment.id).label('count'),
        func.sum(Payment.amount).label('total_amount')
    )

    if start_date:
        stmt = stmt.filter(Payment.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        stmt = stmt.filter(Payment.created_at <= datetime.fromisoformat(end_date))
        
    stmt = stmt.group_by(Payment.status)
    
    result = await db.execute(stmt)
    payment_stats = result.all()
    
    return [
        {
            "status": p.status,
            "count": p.count,
            "amount": float(p.total_amount or 0)
        }
        for p in payment_stats
    ]

# ==================== BOOKING REPORTS ====================

@router.get("/bookings/summary")
async def get_booking_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get booking summary statistics"""
    total_query = select(func.count(Booking.id))
    
    if start_date:
        total_query = total_query.filter(Booking.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        total_query = total_query.filter(Booking.created_at <= datetime.fromisoformat(end_date))
    
    total = (await db.execute(total_query)).scalar() or 0
    
    completed = (await db.execute(
        total_query.filter(Booking.status == BookingStatus.COMPLETED)
    )).scalar() or 0
    
    upcoming = (await db.execute(
        total_query.filter(Booking.status == BookingStatus.CONFIRMED)
    )).scalar() or 0
    
    cancelled = (await db.execute(
        total_query.filter(Booking.status == BookingStatus.CANCELLED)
    )).scalar() or 0
    
    pending = (await db.execute(
        total_query.filter(Booking.status == BookingStatus.PENDING)
    )).scalar() or 0
    
    return {
        "total": total,
        "completed": completed,
        "upcoming": upcoming,
        "cancelled": cancelled,
        "pending": pending
    }

@router.get("/bookings/by-agent")
async def get_bookings_by_agent(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get booking and enquiry performance metrics by agent"""
    # Subquery for enquiry counts
    enquiry_sub = select(
        Enquiry.agent_id,
        func.count(Enquiry.id).label('total_enquiries')
    ).group_by(Enquiry.agent_id).subquery()

    # Main query joining Agents with Bookings and Enquiry subquery
    stmt = select(
        Agent.id,
        Agent.first_name,
        Agent.last_name,
        User.email,
        func.count(Booking.id).label('total_bookings'),
        func.coalesce(enquiry_sub.c.total_enquiries, 0).label('total_enquiries')
    ).outerjoin(Booking, Booking.agent_id == Agent.user_id)\
     .outerjoin(enquiry_sub, enquiry_sub.c.agent_id == Agent.user_id)\
     .join(User, User.id == Agent.user_id)

    if start_date:
        stmt = stmt.filter(Booking.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        stmt = stmt.filter(Booking.created_at <= datetime.fromisoformat(end_date))
        
    stmt = stmt.group_by(Agent.id, Agent.first_name, Agent.last_name, User.email, enquiry_sub.c.total_enquiries)
     
    result = await db.execute(stmt)
    agent_stats = result.all()
    
    return [
        {
            "agent_id": a.id,
            "agent_name": f"{a.first_name} {a.last_name}",
            "email": a.email,
            "total_bookings": a.total_bookings,
            "total_enquiries": int(a.total_enquiries)
        }
        for a in agent_stats
    ]

@router.get("/bookings/by-package")
async def get_bookings_by_package(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get most popular packages"""
    total_bookings_col = func.count(Booking.id).label('total_bookings')
    
    stmt = select(
        Package.id,
        Package.title,
        total_bookings_col,
        func.sum(case((Booking.status == BookingStatus.COMPLETED, 1), else_=0)).label('completed'),
        func.sum(case((Booking.status == BookingStatus.CANCELLED, 1), else_=0)).label('cancelled')
    ).join(Booking, Booking.package_id == Package.id)

    if start_date:
        stmt = stmt.filter(Booking.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        stmt = stmt.filter(Booking.created_at <= datetime.fromisoformat(end_date))
        
    stmt = stmt.group_by(Package.id, Package.title)\
     .order_by(desc(total_bookings_col))\
     .limit(10)
     
    result = await db.execute(stmt)
    package_bookings = result.all()
    
    return [
        {
            "package_id": p.id,
            "package_name": p.title,
            "total_bookings": p.total_bookings,
            "completed": p.completed,
            "cancelled": p.cancelled
        }
        for p in package_bookings
    ]

@router.get("/bookings/conversion")
async def get_booking_conversion(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get booking conversion rates"""
    base_query = select(func.count(Booking.id))
    if start_date:
        base_query = base_query.filter(Booking.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        base_query = base_query.filter(Booking.created_at <= datetime.fromisoformat(end_date))

    total = (await db.execute(base_query)).scalar() or 0
    completed = (await db.execute(
        base_query.filter(Booking.status == BookingStatus.COMPLETED)
    )).scalar() or 0
    
    return {
        "total_bookings": total,
        "completed_bookings": completed,
        "conversion_rate": round((completed / total * 100), 2) if total > 0 else 0
    }
