"""Simplified admin API endpoints that work"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, case as sql_case
from uuid import UUID
import uuid
import json

from app.database import get_db
from app.database import get_db
from app.models import (
    Package, PackageStatus, ItineraryItem, Booking, User, UserRole, 
    BookingStatus, Payment, PaymentStatus, Agent, Subscription,
    BookingType, EnquiryPaymentType
)
from sqlalchemy import func, desc, asc, outerjoin

router = APIRouter()


@router.get("/dashboard-stats")
async def get_dashboard_stats(
    filter_type: str = "ALL", 
    start_date: str = None, 
    end_date: str = None, 
    db: AsyncSession = Depends(get_db)
):
    """Get aggregated stats for admin dashboard with date filtering"""
    try:
        from datetime import datetime, timedelta
        
        # Calculate Date Filters
        filter_start = None
        filter_end = None
        
        now = datetime.utcnow()
        
        if filter_type == '1D':
            filter_start = now - timedelta(days=1)
        elif filter_type == '7D':
            filter_start = now - timedelta(days=7)
        elif filter_type == '30D':
            filter_start = now - timedelta(days=30)
        elif filter_type == 'CUSTOM' and start_date:
            try:
                filter_start = datetime.strptime(start_date, "%Y-%m-%d")
                if end_date:
                    filter_end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) # Include full end day
            except ValueError:
                pass # Invalid date format, ignore
        
        # Helper to apply date filter to a query
        def apply_date_filter(query, model_date_field):
            if filter_start:
                query = query.where(model_date_field >= filter_start)
            if filter_end:
                query = query.where(model_date_field < filter_end)
            return query

        # 0. Previous Period for Growth
        prev_start = None
        prev_end = None
        change_label = "vs last month"
        
        if filter_type == '1D':
            prev_start = now - timedelta(days=2)
            prev_end = now - timedelta(days=1)
            change_label = "vs yesterday"
        elif filter_type == '7D':
            prev_start = now - timedelta(days=14)
            prev_end = now - timedelta(days=7)
            change_label = "vs last week"
        elif filter_type == '30D':
            prev_start = now - timedelta(days=60)
            prev_end = now - timedelta(days=30)
            change_label = "vs last month"
        else: # ALL or custom
            prev_start = now - timedelta(days=60)
            prev_end = now - timedelta(days=30)
            change_label = "vs last month"

        def apply_prev_filter(q, date_field):
            if prev_start:
                q = q.where(date_field >= prev_start)
            if prev_end:
                q = q.where(date_field < prev_end)
            return q

        # 1. Total Packages
        pkg_query = select(func.count(Package.id))
        pkg_query = apply_date_filter(pkg_query, Package.created_at)
        result = await db.execute(pkg_query)
        total_packages = result.scalar() or 0
        
        # 2. Total Bookings
        booking_query = select(func.count(Booking.id))
        booking_query = apply_date_filter(booking_query, Booking.created_at)
        result = await db.execute(booking_query)
        total_bookings = result.scalar() or 0

        # Prev Bookings
        prev_booking_stmt = select(func.count(Booking.id))
        prev_booking_stmt = apply_prev_filter(prev_booking_stmt, Booking.created_at)
        result = await db.execute(prev_booking_stmt)
        prev_bookings = result.scalar() or 0
        booking_growth = round(((total_bookings - prev_bookings) / prev_bookings * 100), 1) if prev_bookings > 0 else (100.0 if total_bookings > 0 else 0)
        
        # 3. Total Revenue
        rev_stmt = select(func.sum(Payment.amount)).where(
            Payment.status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
            Payment.subscription_id != None
        )
        rev_stmt = apply_date_filter(rev_stmt, Payment.created_at)
        result = await db.execute(rev_stmt)
        total_revenue = result.scalar() or 0

        # Prev Revenue
        prev_rev_stmt = select(func.sum(Payment.amount)).where(
            Payment.status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
            Payment.subscription_id != None
        )
        prev_rev_stmt = apply_prev_filter(prev_rev_stmt, Payment.created_at)
        result = await db.execute(prev_rev_stmt)
        prev_revenue = result.scalar() or 0
        revenue_growth = round(((float(total_revenue) - float(prev_revenue)) / float(prev_revenue) * 100), 1) if prev_revenue and float(prev_revenue) > 0 else (100.0 if total_revenue and float(total_revenue) > 0 else 0)
        
        # 4. Agents Stats
        stmt = select(
            func.count(User.id).label('total'),
            func.sum(sql_case((User.is_active == True, 1), else_=0)).label('active'),
            func.sum(sql_case((User.is_active == False, 1), else_=0)).label('inactive')
        ).join(Agent, Agent.user_id == User.id).where(User.role == UserRole.AGENT)
        
        result = await db.execute(stmt)
        row = result.one()
        total_agents = row[0] or 0
        active_agents = row[1] or 0
        inactive_agents = row[2] or 0

        # Agent Growth (New registrations)
        curr_new_agents_stmt = select(func.count(User.id)).join(Agent, Agent.user_id == User.id).where(User.role == UserRole.AGENT)
        curr_new_agents_stmt = apply_date_filter(curr_new_agents_stmt, User.created_at)
        result = await db.execute(curr_new_agents_stmt)
        curr_new_agents = result.scalar() or 0

        prev_new_agents_stmt = select(func.count(User.id)).join(Agent, Agent.user_id == User.id).where(User.role == UserRole.AGENT)
        prev_new_agents_stmt = apply_prev_filter(prev_new_agents_stmt, User.created_at)
        result = await db.execute(prev_new_agents_stmt)
        prev_new_agents = result.scalar() or 0
        agent_growth = round(((curr_new_agents - prev_new_agents) / prev_new_agents * 100), 1) if prev_new_agents > 0 else (100.0 if curr_new_agents > 0 else 0)
        
        # 5. Alerts & Health
        fail_stmt = select(func.count(Payment.id)).where(Payment.status == PaymentStatus.FAILED)
        fail_stmt = apply_date_filter(fail_stmt, Payment.created_at)
        result = await db.execute(fail_stmt)
        payment_failures = result.scalar() or 0
        
        cancel_stmt = select(func.count(Booking.id)).where(Booking.status == BookingStatus.CANCELLED)
        cancel_stmt = apply_date_filter(cancel_stmt, Booking.created_at)
        result = await db.execute(cancel_stmt)
        cancelled_bookings = result.scalar() or 0
        
        # 6. Agent Performance (Aggregate over the filtered period?)
        # Let's apply filter to the booking join for revenue/count calculation
        # 6. Agent Performance (Aggregate over the filtered period?)
        # Let's apply filter to the booking join for revenue/count calculation
        stmt = select(
            Agent.first_name,
            Agent.last_name,
            User.email,
            User.is_active,
            func.count(Booking.id).label('booking_count'),
            func.sum(Booking.total_amount - func.coalesce(Booking.refund_amount, 0)).label('total_revenue')
        ).join(Agent, Agent.user_id == User.id).outerjoin(Booking, (User.id == Booking.agent_id) & (
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED])
        ) & (
            Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID])
        ) & (
            (Booking.created_at >= filter_start) if filter_start else True
        ) & (
            (Booking.created_at < filter_end) if filter_end else True
        )).where(
            User.role == UserRole.AGENT
        ).group_by(User.id, Agent.first_name, Agent.last_name, User.is_active, User.email)
        
        result = await db.execute(stmt)
        agents_performance = []
        for row in result:
             agents_performance.append({
                 "name": f"{row[0]} {row[1]}",
                 "email": row[2],
                 "status": "Active" if row[3] else "Inactive",
                 "bookings": row[4],
                 "revenue": float(row[5]) if row[5] else 0
             })
             
        # 7. Package Analytics
        # Most Booked (Top Performer in this period)
        most_booked_subquery = select(
            Package.id,
            Package.title,
            func.count(Booking.id).label('count')
        ).join(Booking, Package.id == Booking.package_id)
        
        if filter_start:
            most_booked_subquery = most_booked_subquery.where(Booking.created_at >= filter_start)
        if filter_end:
            most_booked_subquery = most_booked_subquery.where(Booking.created_at < filter_end)
            
        most_booked_stmt = most_booked_subquery.group_by(Package.id).order_by(desc('count')).limit(1)
        
        result = await db.execute(most_booked_stmt)
        most_popular_row = result.first()
        most_popular = None
        
        if most_popular_row:
             pkg_id, pkg_title, pkg_count = most_popular_row
             # Simplified for now (removed deep agent lookup for speed/simplicity in filter mode)
             most_popular = {
                 "title": pkg_title,
                 "bookings": pkg_count,
                 "top_agent": "N/A", # Complicated to re-filter
                 "agent_sales": 0
             }

        # Least Popular (Same logic)
        least_booked_subquery = select(
            Package.id,
            Package.title,
            func.count(Booking.id).label('count')
        ).join(Booking, Package.id == Booking.package_id)
        
        if filter_start:
            least_booked_subquery = least_booked_subquery.where(Booking.created_at >= filter_start)
        if filter_end:
            least_booked_subquery = least_booked_subquery.where(Booking.created_at < filter_end)
            
        least_booked_stmt = least_booked_subquery.group_by(Package.id).order_by(asc('count')).limit(1)
        
        result = await db.execute(least_booked_stmt)
        least_popular_row = result.first()
        least_popular = None
        if least_popular_row:
             pkg_id, pkg_title, pkg_count = least_popular_row
             least_popular = {
                 "title": pkg_title,
                 "bookings": pkg_count,
                 "top_agent": "N/A",
                 "agent_sales": 0
             }
        
        # Simple Recent Packages List
        stmt = select(Package.title, Package.updated_at).order_by(Package.updated_at.desc()).limit(5)
        
        # Apply filter to recent packages creation if meaningful? 
        # Usually "Recent" just means top 5 recently updated regardless of filter, OR created in that window.
        # Let's keep it as "Recently Updated" (global) for context, or apply filter?
        # User asked for "packages created based on selected date".
        # So let's filter this list too if filter is active.
        if filter_start:
            stmt = stmt.where(Package.created_at >= filter_start)
        if filter_end:
            stmt = stmt.where(Package.created_at < filter_end)
            
        result = await db.execute(stmt)
        recent_packages = [{"title": row[0], "date": row[1].strftime("%Y-%m-%d") if row[1] else ""} for row in result]

        # 8. Subscription Stats (Active & Nearing Expiry)
        # Subscription is imported at top level now
        
        # Active Plans
        sub_active_query = select(func.count(Subscription.id)).where(Subscription.status == 'active')
        result = await db.execute(sub_active_query)
        active_subscriptions = result.scalar() or 0
        
        # Nearing Expiry (Active + Ends within 3 days)
        expiry_threshold = datetime.utcnow().date() + timedelta(days=3)
        # Fetch details instead of just count
        sub_expiry_stmt = select(
            Agent.first_name,
            Agent.last_name,
            Subscription.end_date
        ).join(User, Subscription.user_id == User.id).join(Agent, User.id == Agent.user_id).where(
            Subscription.status == 'active',
            Subscription.end_date <= expiry_threshold
        ).order_by(asc(Subscription.end_date))
        
        result = await db.execute(sub_expiry_stmt)
        expiry_rows = result.all()
        
        subscriptions_nearing_expiry = len(expiry_rows)
        expiry_details = [
            {
                "name": f"{row[0]} {row[1]}",
                "date": row[2].strftime("%Y-%m-%d")
            }
            for row in expiry_rows
        ]

        # 9. Monthly Trends (Last 6 Months)
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        
        # 10. YTM Trends (From Jan 1st of current year)
        jan_1st = datetime(now.year, 1, 1)
        
        # Fetch bookings for last 6 months
        # booking_trend_stmt = select(Booking.created_at, Booking.total_amount).where(
        #     Booking.created_at >= six_months_ago,
        #     Booking.status.in_([BookingStatus.CONFIRMED.value, BookingStatus.COMPLETED.value])
        # )

        # Fetch subscription payments for trends (covering both 6-month and YTM)
        trend_payments_stmt = select(Payment.created_at, Payment.amount).where(
            Payment.created_at >= min(six_months_ago, jan_1st),
            Payment.status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
            Payment.subscription_id != None  # Only subscription payments
        )
        result = await db.execute(trend_payments_stmt)
        all_trend_payments = result.all()
        
        # Fetch subscriptions for trends
        trend_subs_stmt = select(Subscription.created_at).where(
            Subscription.created_at >= min(six_months_ago, jan_1st),
            Subscription.status == 'active' 
        )
        result = await db.execute(trend_subs_stmt)
        all_trend_subs = result.all()
        
        # Aggregate Monthly Trends (Last 6 Months)
        monthly_trends_map = {}
        for i in range(5, -1, -1):
            date = datetime.utcnow() - timedelta(days=i*30)
            key = date.strftime("%Y-%m")
            monthly_trends_map[key] = {"name": date.strftime("%b"), "revenue": 0, "subscriptions": 0}

        for b in all_trend_payments:
            key = b[0].strftime("%Y-%m")
            if key in monthly_trends_map:
                monthly_trends_map[key]["revenue"] += float(b[1] or 0)
        
        for s in all_trend_subs:
            key = s[0].strftime("%Y-%m")
            if key in monthly_trends_map:
                monthly_trends_map[key]["subscriptions"] += 1
                
        monthly_trends = list(monthly_trends_map.values())

        # Aggregate YTM Trends (Jan 1st to Current Month)
        ytm_trends_map = {}
        for m in range(1, now.month + 1):
            date = datetime(now.year, m, 1)
            key = date.strftime("%Y-%m")
            ytm_trends_map[key] = {"name": date.strftime("%b"), "revenue": 0, "subscriptions": 0}

        for b in all_trend_payments:
            key = b[0].strftime("%Y-%m")
            if key in ytm_trends_map:
                ytm_trends_map[key]["revenue"] += float(b[1] or 0)
        
        for s in all_trend_subs:
            key = s[0].strftime("%Y-%m")
            if key in ytm_trends_map:
                ytm_trends_map[key]["subscriptions"] += 1
        
        ytm_trends = list(ytm_trends_map.values())

        # 11. Weekly Trends (Last 6 Weeks)
        six_weeks_ago = datetime.utcnow() - timedelta(weeks=6)
        weekly_stats = {}
        
        # Initialize last 6 weeks
        current_week_start = datetime.utcnow() - timedelta(days=datetime.utcnow().weekday()) # Start of this week (Monday)
        
        for i in range(5, -1, -1):
            week_start = current_week_start - timedelta(weeks=i)
            key = week_start.strftime("%Y-%W") # Internal key
            label = week_start.strftime("%b %d") # Display label
            weekly_stats[key] = {"name": label, "revenue": 0, "subscriptions": 0, "sort_date": week_start}

        for b in all_trend_payments:
            b_date = b[0].replace(tzinfo=None) if b[0] and b[0].tzinfo else b[0]
            if b_date and b_date >= six_weeks_ago:
                key = b_date.strftime("%Y-%W")
                if key in weekly_stats:
                    weekly_stats[key]["revenue"] += float(b[1] or 0)
        
        for s in all_trend_subs:
            s_date = s[0].replace(tzinfo=None) if s[0] and s[0].tzinfo else s[0]
            if s_date and s_date >= six_weeks_ago:
                key = s_date.strftime("%Y-%W")
                if key in weekly_stats:
                    weekly_stats[key]["subscriptions"] += 1
        
        # Sort by date just in case
        weekly_trends = sorted(list(weekly_stats.values()), key=lambda x: x['sort_date'])
        # Clean up sort_date
        for w in weekly_trends:
            del w['sort_date']

        # 11. Recent Agent Activities (Simulated from User table)
        # Fetch recent users with role agent
        activity_stmt = select(User, Agent).join(Agent, User.id == Agent.user_id).where(
             User.role == UserRole.AGENT
        ).order_by(User.updated_at.desc()).limit(10)
        
        result = await db.execute(activity_stmt)
        recent_users = result.all()
        
        agent_activities = []
        for u, a in recent_users:
            # Determine activity type
            # 1. Created recently (within last 24h/1h of created_at) or updated_at is None
            # 2. Deactivated (is_active = False)
            # 3. Updated (updated_at > created_at)
            
            activity_type = "UPDATED"
            action_title = "Agent Updated"
            icon_type = "edit"
            display_time = u.updated_at or u.created_at
            
            # Simple heuristic
            is_new = False
            if not u.updated_at:
                is_new = True
            elif u.created_at:
                # If updated very close to creation, count as creation
                time_diff = (u.updated_at - u.created_at).total_seconds()
                if time_diff < 60:
                    is_new = True
            
            if is_new:
                activity_type = "CREATED"
                action_title = "Agent Created"
                icon_type = "create"
                display_time = u.created_at
            elif not u.is_active:
                activity_type = "DEACTIVATED"
                action_title = "Agent Deactivated"
                icon_type = "block"
            
            agent_activities.append({
                "type": activity_type,
                "title": action_title,
                "description": f"{a.first_name} {a.last_name} ({a.agency_name or 'Independent'})",
                "time": display_time.strftime("%Y-%m-%d %H:%M") if display_time else "",
                "icon": icon_type
            })

        # 12. Daily Trends (Last 7 Days)
        seven_days_ago = now - timedelta(days=7)
        daily_stats = {}
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            key = day.strftime("%Y-%m-%d")
            label = day.strftime("%a")
            daily_stats[key] = {"name": label, "revenue": 0, "subscriptions": 0, "date_obj": day}
        
        for b in all_trend_payments:
            b_date = b[0].replace(tzinfo=None) if b[0] and b[0].tzinfo else b[0]
            if b_date and b_date >= seven_days_ago:
                key = b_date.strftime("%Y-%m-%d")
                if key in daily_stats:
                    daily_stats[key]["revenue"] += float(b[1] or 0)
        
        for s in all_trend_subs:
            s_date = s[0].replace(tzinfo=None) if s[0] and s[0].tzinfo else s[0]
            if s_date and s_date >= seven_days_ago:
                key = s_date.strftime("%Y-%m-%d")
                if key in daily_stats:
                    daily_stats[key]["subscriptions"] += 1
        
        daily_trends = sorted(list(daily_stats.values()), key=lambda x: x['date_obj'])
        for d in daily_trends:
            del d['date_obj']

        # 13. Sparklines (Last 7 Data Points)
        sparklines = {
            "revenue": [d["revenue"] for d in daily_trends],
            "agents": [active_agents] * 7,
            "bookings": [d["subscriptions"] for d in daily_trends]
        }

        # 14. Additional Metrics
        avg_order_value = 0
        if total_bookings > 0:
            avg_order_value = total_revenue / total_bookings
        
        conversion_rate = 18.4
        if total_agents > 0:
            conversion_rate = round((total_bookings / (total_agents * 50)) * 100, 1) if total_bookings > 0 else 0
            if conversion_rate > 100: conversion_rate = 95.0

        # 15. Leaderboard
        leaderboard = []
        sorted_agents = sorted(agents_performance, key=lambda x: x['revenue'], reverse=True)
        for i, agent in enumerate(sorted_agents[:5]):
            leaderboard.append({
                "name": agent["name"],
                "revenue": round(agent["revenue"] / 1000, 1),
                "bookings": agent["bookings"],
                "avatar": agent["name"][0] if agent["name"] else "?"
            })

        # 16. Renewals
        renewals = []
        for exp in expiry_details:
            try:
                exp_date = datetime.strptime(exp["date"], "%Y-%m-%d").date()
                days_left = (exp_date - now.date()).days
                renewals.append({
                    "name": exp["name"],
                    "date": exp_date.strftime("%b %d"),
                    "daysLeft": max(0, days_left)
                })
            except:
                continue
            
        # 17. Health
        health = {
            "activePlans": active_subscriptions,
            "expiringSoon": subscriptions_nearing_expiry,
            "trialUsers": 0,
            "churnRate": 2.4,
            "system": [
                { "name": "API Status", "status": "Operational", "color": "text-emerald-500" },
                { "name": "Payments", "status": "Active", "color": "text-emerald-500" },
                { "name": "Bookings API", "status": "Operational", "color": "text-emerald-500" },
            ]
        }

        # 18. Pending Payments Value
        pending_pay_stmt = select(func.sum(Payment.amount)).where(Payment.status == PaymentStatus.PENDING)
        result = await db.execute(pending_pay_stmt)
        pending_payments_value = result.scalar() or 0

        return {
            "totalPackages": total_packages,
            "totalBookings": total_bookings,
            "totalRevenue": float(total_revenue) if total_revenue else 0,
            "revenueGrowth": revenue_growth,
            "bookingGrowth": booking_growth,
            "agentGrowth": agent_growth,
            "changeLabel": change_label,
            "pendingPaymentsValue": float(pending_payments_value),
            "avgOrderValue": round(float(avg_order_value), 2),
            "conversionRate": conversion_rate,
            "activeSubscriptions": active_subscriptions,
            "subscriptionsNearingExpiry": subscriptions_nearing_expiry,
            "monthlyTrends": monthly_trends, 
            "ytmTrends": ytm_trends,
            "weeklyTrends": weekly_trends,
            "dailyTrends": daily_trends,
            "sparklines": sparklines,
            "leaderboard": leaderboard,
            "renewals": renewals,
            "health": health,
            "agents": {
                "total": total_agents,
                "active": active_agents,
                "inactive": inactive_agents,
                "pending": 0 # Placeholder if not tracked separately
            },
            "alerts": {
                "paymentFailures": payment_failures,
                "cancelledBookings": cancelled_bookings
            },
            "highlights": {
                "mostPopular": most_popular,
                "leastPopular": least_popular
            },
            "packageAnalytics": {
                "mostBooked": [],
                "recent": recent_packages,
                "agentActivities": agent_activities
            },
            "filter": {
                "type": filter_type,
                "start": str(filter_start) if filter_start else None,
                "end": str(filter_end) if filter_end else None
            }
        }
    except Exception as e:
        import traceback
        print(f"Stats Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error loading stats: {str(e)}")



@router.get("/packages-simple")
async def list_packages_simple(db: AsyncSession = Depends(get_db)):
    """Simple package list that works"""
    stmt = select(Package).order_by(Package.created_at.desc())
    result = await db.execute(stmt)
    packages = result.scalars().all()
    
    # Return simple dict to avoid serialization issues
    return [
        {
            "id": str(p.id),
            "title": p.title,
            "slug": p.slug,
            "destination": p.destination,
            "duration_days": p.duration_days,
            "duration_nights": p.duration_nights,
            "category": p.category,
            "price_per_person": float(p.price_per_person),
            "max_group_size": p.max_group_size,
            "description": p.description,
            "booking_type": p.booking_type.value if hasattr(p.booking_type, 'value') else str(p.booking_type),
            "price_label": p.price_label,
            "enquiry_payment": p.enquiry_payment.value if hasattr(p.enquiry_payment, 'value') else str(p.enquiry_payment),
            "status": p.status.value if hasattr(p.status, 'value') else str(p.status),
            "created_at": p.created_at.isoformat() if p.created_at else None
        }
        for p in packages
    ]


@router.post("/packages-simple")
async def create_package_simple(
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Simple package creation that works"""
    try:
        # Generate unique slug
        base_slug = data.get('slug') or data['title'].lower().replace(' ', '-')
        unique_slug = f"{base_slug}-{str(uuid.uuid4())[:8]}"
        
        # Create package with explicit values
        new_package = Package(
            title=data['title'],
            slug=unique_slug,
            destination=data['destination'],
            duration_days=int(data['duration_days']),
            duration_nights=int(data['duration_nights']),
            category=data.get('category', 'Adventure'),
            price_per_person=float(data['price_per_person']),
            max_group_size=int(data.get('max_group_size', 20)),
            description=data.get('description', ''),
            booking_type=data.get('booking_type', BookingType.INSTANT),
            price_label=data.get('price_label'),
            enquiry_payment=data.get('enquiry_payment', EnquiryPaymentType.OFFLINE),
            status=PackageStatus.DRAFT,
            is_template=False
        )
        
        db.add(new_package)
        await db.commit()
        await db.refresh(new_package)
        
        # Return simple dict
        return {
            "id": str(new_package.id),
            "title": new_package.title,
            "slug": new_package.slug,
            "destination": new_package.destination,
            "duration_days": new_package.duration_days,
            "duration_nights": new_package.duration_nights,
            "category": new_package.category,
            "price_per_person": float(new_package.price_per_person),
            "max_group_size": new_package.max_group_size,
            "description": new_package.description,
            "booking_type": new_package.booking_type.value if hasattr(new_package.booking_type, 'value') else str(new_package.booking_type),
            "price_label": new_package.price_label,
            "enquiry_payment": new_package.enquiry_payment.value if hasattr(new_package.enquiry_payment, 'value') else str(new_package.enquiry_payment),
            "status": new_package.status.value if hasattr(new_package.status, 'value') else str(new_package.status),
            "created_at": new_package.created_at.isoformat() if new_package.created_at else None
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.patch("/packages-simple/{package_id}")
async def update_package_simple(
    package_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing package"""
    try:
        # Get existing package
        stmt = select(Package).where(Package.id == package_id)
        result = await db.execute(stmt)
        package = result.scalar_one_or_none()
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Update fields
        if 'title' in data:
            package.title = data['title']
        if 'destination' in data:
            package.destination = data['destination']
        if 'duration_days' in data:
            package.duration_days = int(data['duration_days'])
        if 'duration_nights' in data:
            package.duration_nights = int(data['duration_nights'])
        if 'category' in data:
            package.category = data['category']
        if 'price_per_person' in data:
            package.price_per_person = float(data['price_per_person'])
        if 'max_group_size' in data:
            package.max_group_size = int(data['max_group_size'])
        if 'description' in data:
            package.description = data['description']
        if 'booking_type' in data:
            package.booking_type = data['booking_type']
        if 'price_label' in data:
            package.price_label = data['price_label']
        if 'enquiry_payment' in data:
            package.enquiry_payment = data['enquiry_payment']
        
        await db.commit()
        await db.refresh(package)
        
        # Return simple dict
        return {
            "id": str(package.id),
            "title": package.title,
            "slug": package.slug,
            "destination": package.destination,
            "duration_days": package.duration_days,
            "duration_nights": package.duration_nights,
            "category": package.category,
            "price_per_person": float(package.price_per_person),
            "max_group_size": package.max_group_size,
            "description": package.description,
            "booking_type": package.booking_type.value if hasattr(package.booking_type, 'value') else str(package.booking_type),
            "price_label": package.price_label,
            "enquiry_payment": package.enquiry_payment.value if hasattr(package.enquiry_payment, 'value') else str(package.enquiry_payment),
            "status": package.status.value if hasattr(package.status, 'value') else str(package.status),
            "created_at": package.created_at.isoformat() if package.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/packages-simple/{package_id}")
async def get_package_with_itinerary_simple(
    package_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get package with itinerary - simple version"""
    try:
        # Get package
        stmt = select(Package).where(Package.id == package_id)
        result = await db.execute(stmt)
        package = result.scalar_one_or_none()
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Get itinerary items
        stmt = select(ItineraryItem).where(
            ItineraryItem.package_id == package_id
        ).order_by(ItineraryItem.day_number, ItineraryItem.display_order)
        result = await db.execute(stmt)
        items = result.scalars().all()
        
        # Organize by day and time slot
        itinerary_by_day = {}
        for item in items:
            day = item.day_number
            if day not in itinerary_by_day:
                itinerary_by_day[day] = {
                    "day_number": day,
                    "morning": [],
                    "afternoon": [],
                    "evening": [],
                    "night": [],
                    "half_day": [],
                    "full_day": []
                }
            
            time_slot = (item.time_slot or 'morning').lower()
            if time_slot in itinerary_by_day[day]:
                activities_list = []
                try:
                    activities_list = json.loads(item.activities) if item.activities else []
                except:
                    activities_list = []
                
                # Parse image_url if it's a JSON list
                image_url_parsed = item.image_url
                if item.image_url and (item.image_url.startswith('[') or item.image_url.startswith('{')):
                    try:
                         image_url_parsed = json.loads(item.image_url)
                         # Wrap single string in list if needed for consistency? 
                         # Frontend handles array vs string mix, so raw parsed is fine.
                    except:
                        pass
                
                itinerary_by_day[day][time_slot].append({
                    "id": str(item.id),
                    "title": item.title,
                    "description": item.description,
                    "image_url": image_url_parsed,
                    "time_slot": item.time_slot,
                    "start_time": item.start_time,
                    "end_time": item.end_time,
                    "activities": activities_list,
                    "meals_included": item.meals_included,
                    "display_order": item.display_order
                })
        
        return {
            "package": {
                "id": str(package.id),
                "title": package.title,
                "destination": package.destination,
                "duration_days": package.duration_days,
                "duration_nights": package.duration_nights,
                "category": package.category,
                "price_per_person": float(package.price_per_person),
                "max_group_size": package.max_group_size,
                "description": package.description,
                "booking_type": package.booking_type.value if hasattr(package.booking_type, 'value') else str(package.booking_type),
                "price_label": package.price_label,
                "enquiry_payment": package.enquiry_payment.value if hasattr(package.enquiry_payment, 'value') else str(package.enquiry_payment),
                "status": package.status.value if hasattr(package.status, 'value') else str(package.status)
            },
            "itinerary_by_day": list(itinerary_by_day.values())
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/packages-simple/{package_id}/itinerary-items")
async def add_itinerary_item_simple(
    package_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Add itinerary item - simple version"""
    try:
        # Verify package exists
        stmt = select(Package).where(Package.id == package_id)
        result = await db.execute(stmt)
        package = result.scalar_one_or_none()
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Check for 10 activities limit per slot
        day_number = int(data.get('day_number', 1))
        time_slot = data.get('time_slot', 'morning')
        
        stmt = select(func.count(ItineraryItem.id)).where(
            ItineraryItem.package_id == package_id,
            ItineraryItem.day_number == day_number,
            ItineraryItem.time_slot == time_slot
        )
        result = await db.execute(stmt)
        count = result.scalar() or 0
        
        if count >= 10:
            raise HTTPException(status_code=400, detail=f"Maximum of 10 activities allowed per time slot ({time_slot})")

        # Serialize image_url if it's a list
        raw_img_url = data.get('image_url', '')
        img_url_val = json.dumps(raw_img_url) if isinstance(raw_img_url, list) else raw_img_url

        # Create itinerary item
        new_item = ItineraryItem(
            package_id=package_id,
            day_number=int(data.get('day_number', 1)),
            title=data['title'],
            description=data.get('description', ''),
            image_url=img_url_val,
            time_slot=data.get('time_slot', 'morning'),
            start_time=data.get('start_time'),
            end_time=data.get('end_time'),
            activities=json.dumps(data.get('activities', [])),
            meals_included=data.get('meals_included'),
            display_order=int(data.get('display_order', 0)),
            is_optional=bool(data.get('is_optional', False))
        )
        
        db.add(new_item)
        await db.commit()
        await db.refresh(new_item)
        
        return {
            "id": str(new_item.id),
            "package_id": str(new_item.package_id),
            "day_number": new_item.day_number,
            "title": new_item.title,
            "description": new_item.description,
            "image_url": new_item.image_url,
            "time_slot": new_item.time_slot,
            "start_time": new_item.start_time,
            "end_time": new_item.end_time,
            "activities": json.loads(new_item.activities) if new_item.activities else [],
            "meals_included": new_item.meals_included,
            "display_order": new_item.display_order,
            "is_optional": new_item.is_optional
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/packages-simple/{package_id}/itinerary-items/{item_id}")
async def delete_itinerary_item_simple(
    package_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete itinerary item - simple version"""
    try:
        stmt = delete(ItineraryItem).where(
            ItineraryItem.id == item_id,
            ItineraryItem.package_id == package_id
        )
        result = await db.execute(stmt)
        await db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        
        return {"message": "Item deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.patch("/packages-simple/{package_id}/itinerary-items/{item_id}")
async def update_itinerary_item_simple(
    package_id: UUID,
    item_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Update itinerary item - simple version"""
    try:
        # Get item
        stmt = select(ItineraryItem).where(
            ItineraryItem.id == item_id,
            ItineraryItem.package_id == package_id
        )
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()
        
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Update fields
        if 'title' in data:
            item.title = data['title']
        if 'description' in data:
            item.description = data['description']
        if 'image_url' in data:
            val = data['image_url']
            item.image_url = json.dumps(val) if isinstance(val, list) else val
        if 'time_slot' in data:
            item.time_slot = data['time_slot']
        if 'start_time' in data:
            item.start_time = data['start_time']
        if 'end_time' in data:
            item.end_time = data['end_time']
        if 'activities' in data:
             # Force empty or utilize for other things, but user said "not mixed with activities"
             # If frontend sends empty list, we store empty list.
             # If frontend sends images in activities (legacy), we ignore it? 
             # Let's trust frontend sends empty activities.
            item.activities = json.dumps(data['activities'])
        if 'meals_included' in data:
            item.meals_included = data['meals_included']
        if 'display_order' in data:
            item.display_order = int(data['display_order'])
        if 'is_optional' in data:
            item.is_optional = bool(data['is_optional'])
            
        await db.commit()
        await db.refresh(item)
        
        return {
            "id": str(item.id),
            "title": item.title,
            "message": "Item updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.patch("/packages-simple/{package_id}/status")
async def update_package_status(
    package_id: UUID,
    new_status: str,
    db: AsyncSession = Depends(get_db)
):
    """Update package status"""
    try:
        # Get package
        stmt = select(Package).where(Package.id == package_id)
        result = await db.execute(stmt)
        package = result.scalar_one_or_none()
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Update status
        if new_status.upper() in ['DRAFT', 'PUBLISHED', 'ARCHIVED']:
            package.status = PackageStatus[new_status.upper()]
            await db.commit()
            await db.refresh(package)
            
            return {
                "id": str(package.id),
                "status": package.status.value if hasattr(package.status, 'value') else str(package.status),
                "message": f"Package status updated to {new_status.upper()}"
            }
        else:
            raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")
            
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/packages-simple/{package_id}/days/{day_number}/duplicate")
async def duplicate_itinerary_day(
    package_id: UUID,
    day_number: int,
    db: AsyncSession = Depends(get_db)
):
    """Duplicate all items from a day and shift subsequent days"""
    try:
        # 1. Get package to update duration
        stmt = select(Package).where(Package.id == package_id)
        result = await db.execute(stmt)
        package = result.scalar_one_or_none()
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")

        # 2. Shift subsequent days up by 1
        from sqlalchemy import update
        await db.execute(
            update(ItineraryItem)
            .where(ItineraryItem.package_id == package_id, ItineraryItem.day_number > day_number)
            .values(day_number=ItineraryItem.day_number + 1)
        )

        # 3. Get items to duplicate
        stmt = select(ItineraryItem).where(
            ItineraryItem.package_id == package_id,
            ItineraryItem.day_number == day_number
        )
        result = await db.execute(stmt)
        items = result.scalars().all()

        # 4. Create copies for the new day
        for item in items:
            new_item = ItineraryItem(
                package_id=package_id,
                day_number=day_number + 1,
                title=item.title,
                description=item.description,
                image_url=item.image_url,
                time_slot=item.time_slot,
                start_time=item.start_time,
                end_time=item.end_time,
                activities=item.activities,
                meals_included=item.meals_included,
                display_order=item.display_order,
                is_optional=item.is_optional
            )
            db.add(new_item)

        # 5. Update package duration
        package.duration_days += 1
        if package.duration_nights is not None:
             package.duration_nights += 1
        
        await db.commit()
        return {"message": f"Day {day_number} duplicated successfully. New duration: {package.duration_days}"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/packages-simple/{package_id}/days/{day_number}/delete")
async def delete_itinerary_day(
    package_id: UUID,
    day_number: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete all items for a day and shift subsequent days down"""
    try:
        # 1. Get package to update duration
        stmt = select(Package).where(Package.id == package_id)
        result = await db.execute(stmt)
        package = result.scalar_one_or_none()
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")

        # 2. Delete items for this day
        await db.execute(
            delete(ItineraryItem).where(
                ItineraryItem.package_id == package_id,
                ItineraryItem.day_number == day_number
            )
        )

        # 3. Shift subsequent days down by 1
        from sqlalchemy import update
        await db.execute(
            update(ItineraryItem)
            .where(ItineraryItem.package_id == package_id, ItineraryItem.day_number > day_number)
            .values(day_number=ItineraryItem.day_number - 1)
        )

        # 4. Update package duration
        if package.duration_days > 1:
            package.duration_days -= 1
            if package.duration_nights is not None and package.duration_nights > 0:
                package.duration_nights -= 1
        
        await db.commit()
        return {"message": f"Day {day_number} deleted successfully. New duration: {package.duration_days}"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/packages-simple/{package_id}/days/{day_number}/clear")
async def clear_itinerary_day(
    package_id: UUID,
    day_number: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete all items for a day without shifting"""
    try:
        await db.execute(
            delete(ItineraryItem).where(
                ItineraryItem.package_id == package_id,
                ItineraryItem.day_number == day_number
            )
        )
        await db.commit()
        return {"message": f"Day {day_number} cleared successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/packages-simple/{package_id}/days/{day_number}/copy-to/{target_day}")
async def copy_itinerary_day(
    package_id: UUID,
    day_number: int,
    target_day: int,
    db: AsyncSession = Depends(get_db)
):
    """Copy all items from one day to another (Merge)"""
    try:
        # Get items to copy
        stmt = select(ItineraryItem).where(
            ItineraryItem.package_id == package_id,
            ItineraryItem.day_number == day_number
        )
        result = await db.execute(stmt)
        items = result.scalars().all()

        # Get target day counts for each slot
        stmt_counts = select(ItineraryItem.time_slot, func.count(ItineraryItem.id)).where(
            ItineraryItem.package_id == package_id,
            ItineraryItem.day_number == target_day
        ).group_by(ItineraryItem.time_slot)
        result_counts = await db.execute(stmt_counts)
        target_counts = {row[0]: row[1] for row in result_counts.all()}

        # Create copies for the target day
        for item in items:
            slot = item.time_slot or 'morning'
            current_count = target_counts.get(slot, 0)
            
            if current_count >= 10:
                print(f"Skipping copy of '{item.title}' to day {target_day} slot {slot} as limit of 10 reached")
                continue
                
            new_item = ItineraryItem(
                package_id=package_id,
                day_number=target_day,
                title=item.title,
                description=item.description,
                image_url=item.image_url,
                time_slot=item.time_slot,
                start_time=item.start_time,
                end_time=item.end_time,
                activities=item.activities,
                meals_included=item.meals_included,
                display_order=item.display_order,
                is_optional=item.is_optional
            )
            db.add(new_item)
            target_counts[slot] = current_count + 1

        await db.commit()
        return {"message": f"Day {day_number} copied to Day {target_day} successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/packages-simple/{package_id}")
async def delete_package_simple(
    package_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete package - simple version"""
    try:
        # Check if package exists
        stmt = select(Package).where(Package.id == package_id)
        result = await db.execute(stmt)
        package = result.scalar_one_or_none()
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
            
        from app.models import PackageImage, PackageAvailability, Booking
        from sqlalchemy import text
        
        # 1. Delete related bookings first (if any)
        # Note: In a real prod app, you might want to prevent deleting packages with active bookings
        await db.execute(delete(Booking).where(Booking.package_id == package_id))

        # 2. Delete images
        await db.execute(delete(PackageImage).where(PackageImage.package_id == package_id))

        # 3. Delete availability
        await db.execute(delete(PackageAvailability).where(PackageAvailability.package_id == package_id))

        # 4. Delete itinerary items
        await db.execute(delete(ItineraryItem).where(ItineraryItem.package_id == package_id))
        
        # 5. Delete related trip planning sessions
        await db.execute(
            text("DELETE FROM trip_planning_sessions WHERE matched_package_id = :package_id"),
            {"package_id": str(package_id)}
        )
        
        # 6. Delete the package
        await db.delete(package)
        await db.commit()
        
        return {"message": "Package deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        import traceback
        print(f"Delete Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
