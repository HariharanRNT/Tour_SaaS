"""Agent Dashboard API endpoints for market insights"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.database import get_db
from app.models import Package, Booking, User, UserRole, Subscription, PackageStatus, BookingStatus
from app.schemas import BookingWithPackageResponse
from app.api.deps import get_current_agent
from app.services.notification_service import NotificationService

router = APIRouter()

@router.get("/stats")
async def get_agent_dashboard_stats(
    filter_type: str = "ALL",
    start_date: str = None,
    end_date: str = None,
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(get_current_agent)
):
    """Get stats for agent dashboard with date filtering"""
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
        if filter_type == 'CUSTOM' and start_date:
            try:
                filter_start = datetime.strptime(start_date, "%Y-%m-%d")
                
                if end_date:
                    filter_end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            except ValueError:
                pass 
        
        # Helper to apply date filter
        def apply_date_filter(query, model_date_field):
            if filter_start:
                query = query.where(model_date_field >= filter_start)
            if filter_end:
                query = query.where(model_date_field < filter_end)
            return query

        # --- 1. Basic Counts (Filtered) ---
        
        # Packages: Total, Published, Draft (Scoped to Agent)
        # Note: Usually "Total Packages" implies current inventory, but if filtering by date, 
        # it implies "Packages Created in this period". 
        pkg_base = select(Package.id).where(Package.created_by == current_agent.id)
        pkg_base = apply_date_filter(pkg_base, Package.created_at)
        
        # We can run distinct counts or just fetch and count if easier, but independent queries are cleaner.
        # Total
        res = await db.execute(select(func.count()).select_from(pkg_base.subquery()))
        total_packages = res.scalar() or 0
        
        # Published
        # We need to apply filter to creation date, AND check status.
        pub_query = select(func.count(Package.id)).where(
            Package.created_by == current_agent.id,
            Package.status == PackageStatus.PUBLISHED
        )
        pub_query = apply_date_filter(pub_query, Package.created_at)
        res = await db.execute(pub_query)
        published_packages = res.scalar() or 0
        
        # Drafts
        draft_query = select(func.count(Package.id)).where(
            Package.created_by == current_agent.id,
            Package.status == PackageStatus.DRAFT
        )
        draft_query = apply_date_filter(draft_query, Package.created_at)
        res = await db.execute(draft_query)
        draft_packages = res.scalar() or 0

        # Bookings: Total, Active, Pending (Scoped to Agent)
        # Booking.agent_id allows tracking bookings *made by* agent (if agent acts as Booker) 
        # OR bookings *owned* by agent (assigned). `agent_bookings.py` uses `details.agent_id`.
        # Taking `current_agent.id` as the filter.
        
        bk_base_query = select(Booking).where(Booking.agent_id == current_agent.id)
        # Apply filter to booking creation date
        if filter_start:
            bk_base_query = bk_base_query.where(Booking.created_at >= filter_start)
        if filter_end:
            bk_base_query = bk_base_query.where(Booking.created_at < filter_end)
            
        # Execute once implies fetching all rows? Might be heavy. Let's do sums.
        
        # Total Bookings
        bk_count_query = select(func.count(Booking.id)).where(Booking.agent_id == current_agent.id)
        bk_count_query = apply_date_filter(bk_count_query, Booking.created_at)
        res = await db.execute(bk_count_query)
        total_bookings = res.scalar() or 0
        
        # Active (Confirmed or Pending) AND Upcoming Trip
        active_query = select(func.count(Booking.id)).where(
            Booking.agent_id == current_agent.id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
            Booking.travel_date >= now.date()  # Only upcoming trips
        )
        active_query = apply_date_filter(active_query, Booking.created_at)
        res = await db.execute(active_query)
        active_bookings = res.scalar() or 0
        
        # Pending Only AND Upcoming Trip
        pending_query = select(func.count(Booking.id)).where(
            Booking.agent_id == current_agent.id,
            Booking.status == BookingStatus.PENDING,
            Booking.travel_date >= now.date()  # Only upcoming trips
        )
        pending_query = apply_date_filter(pending_query, Booking.created_at)
        res = await db.execute(pending_query)
        pending_bookings = res.scalar() or 0
        
        # Revenue (Confirmed/Completed)
        rev_query = select(func.sum(Booking.total_amount)).where(
            Booking.agent_id == current_agent.id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
        )
        rev_query = apply_date_filter(rev_query, Booking.created_at)
        res = await db.execute(rev_query)
        total_revenue = res.scalar() or 0

        # Cancellations (Scoped to Agent)
        cancel_query = select(func.count(Booking.id)).where(
            Booking.agent_id == current_agent.id,
            Booking.status == BookingStatus.CANCELLED
        )
        cancel_query = apply_date_filter(cancel_query, Booking.created_at)
        res = await db.execute(cancel_query)
        cancelled_bookings = res.scalar() or 0

        # Today's Bookings (Real-time)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_query = select(func.count(Booking.id)).where(
            Booking.agent_id == current_agent.id,
            Booking.created_at >= today_start
        )
        res = await db.execute(today_query)
        today_bookings = res.scalar() or 0

        # --- 2. Benchmark/Highlights (Filtered) ---
        
        # 1. My Top Performer (Agent's Most Booked Package in Period)
        stmt = select(
            Package.id,
            Package.title,
            Package.view_count,
            func.count(Booking.id).label('count'),
            func.sum(Booking.total_amount).label('revenue')
        ).join(Booking, Package.id == Booking.package_id).where(
            Booking.agent_id == current_agent.id
        )
        # Apply filter to bookings
        stmt = apply_date_filter(stmt, Booking.created_at)
        
        stmt = stmt.group_by(Package.id, Package.title, Package.view_count).order_by(desc('count')).limit(1)
        
        result = await db.execute(stmt)
        most_popular_row = result.first()
        most_popular = None
        
        if most_popular_row:
             pkg_id, pkg_title, pkg_views, pkg_count, pkg_revenue = most_popular_row
             
             # Conversion: (bookings / views) * 100
             conversion = (pkg_count / pkg_views * 100) if pkg_views and pkg_views > 0 else 0
             
             most_popular = {
                 "title": pkg_title,
                 "bookings": pkg_count,
                 "revenue": float(pkg_revenue) if pkg_revenue else 0,
                 "views": pkg_views or 0,
                 "conversion": round(conversion, 1)
             }

        # 2. My Lowest Traction
        stmt = select(
            Package.id,
            Package.title,
            Package.view_count,
            func.count(Booking.id).label('count')
        ).join(Booking, Package.id == Booking.package_id).where(
            Booking.agent_id == current_agent.id
        )
        stmt = apply_date_filter(stmt, Booking.created_at)
        stmt = stmt.group_by(Package.id, Package.title, Package.view_count).order_by(asc('count')).limit(1)
        
        result = await db.execute(stmt)
        least_popular_row = result.first()
        least_popular = None
        
        if least_popular_row:
             pkg_id, pkg_title, pkg_views, pkg_count = least_popular_row
             least_popular = {
                 "title": pkg_title,
                 "bookings": pkg_count,
                 "views": pkg_views or 0,
                 "agent_sales": pkg_count
             }

        # 3. My Most Booked Packages List
        stmt = select(
            Package.title,
            func.count(Booking.id).label('count')
        ).join(Booking, Package.id == Booking.package_id).where(
            Booking.agent_id == current_agent.id
        )
        stmt = apply_date_filter(stmt, Booking.created_at)
        stmt = stmt.group_by(Package.id, Package.title).order_by(desc('count')).limit(5)
        
        result = await db.execute(stmt)
        most_booked = [{"title": row[0], "bookings": row[1]} for row in result]

        # 4. Recent Bookings (Upcoming and Completed)
        upcoming_bookings_stmt = select(Booking).where(
            Booking.agent_id == current_agent.id,
            Booking.travel_date >= now.date(),
            Booking.status.notin_([BookingStatus.CANCELLED, BookingStatus.COMPLETED])
        ).order_by(asc(Booking.travel_date)).limit(5).options(
            selectinload(Booking.travelers),
            selectinload(Booking.package).selectinload(Package.images),
            selectinload(Booking.package).selectinload(Package.itinerary_items),
            selectinload(Booking.package).selectinload(Package.availability),
            selectinload(Booking.package).selectinload(Package.dest_metadata),
            selectinload(Booking.user).selectinload(User.subscription),
            selectinload(Booking.refund)
        )
        upcoming_res = await db.execute(upcoming_bookings_stmt)
        upcoming_list = upcoming_res.scalars().all()

        completed_bookings_stmt = select(Booking).where(
            Booking.agent_id == current_agent.id,
            (Booking.travel_date < now.date()) | (Booking.status.in_([BookingStatus.CANCELLED, BookingStatus.COMPLETED]))
        ).order_by(desc(Booking.travel_date)).limit(5).options(
            selectinload(Booking.travelers),
            selectinload(Booking.package).selectinload(Package.images),
            selectinload(Booking.package).selectinload(Package.itinerary_items),
            selectinload(Booking.package).selectinload(Package.availability),
            selectinload(Booking.package).selectinload(Package.dest_metadata),
            selectinload(Booking.user).selectinload(User.subscription),
            selectinload(Booking.refund)
        )
        completed_res = await db.execute(completed_bookings_stmt)
        completed_list = completed_res.scalars().all()

        # Check Subscription Status
        # Active if status is 'active' or 'trial' and not expired
        # We can also check specific features from the plan if needed
        is_plan_active = False
        
        # Fetch active or trial subscription first
        sub_stmt = select(Subscription).where(
            Subscription.user_id == current_agent.id,
            Subscription.status.in_(['active', 'trial'])
        ).order_by(desc(Subscription.end_date)).limit(1)
        
        sub_res = await db.execute(sub_stmt)
        subscription = sub_res.scalar_one_or_none()
        
        if subscription:
             # We found an active/trial plan
             is_plan_active = True
             
             # Check for expiry (within 3 days)
             try:
                 expiry_date = subscription.end_date
                 if isinstance(expiry_date, str):
                     expiry_date = datetime.strptime(expiry_date, "%Y-%m-%d").date()
                 
                 days_left = (expiry_date - now.date()).days
                 
                 if 0 <= days_left <= 3:
                     # Check if we already notified recently to avoid spamming every refresh
                     # We search for any unread subscription warnings created in the last 24h
                     from sqlalchemy import and_
                     check_stmt = select(Notification).where(
                         and_(
                             Notification.user_id == current_agent.id,
                             Notification.type == "warning",
                             Notification.title == "Subscription Expiry Warning",
                             Notification.created_at >= (now - timedelta(days=1))
                         )
                     )
                     check_res = await db.execute(check_stmt)
                     existing_note = check_res.scalar_one_or_none()
                     
                     if not existing_note:
                         await NotificationService.notify_subscription_expiry(
                             db=db,
                             agent_id=current_agent.id,
                             days_left=days_left
                         )
             except Exception as sub_err:
                 print(f"Error checking sub expiry notification: {sub_err}")
        else:
             # Fallback check: maybe the latest is 'upcoming' but we want to know?
             # Actually, if there is no active/trial, then they are restricted.
             # So is_plan_active remains False.
             pass

        return {
            # Access Control
            "isPlanActive": is_plan_active,

            # New direct stats
            "totalPackages": total_packages,
            "publishedPackages": published_packages,
            "draftPackages": draft_packages,
            "totalBookings": total_bookings,
            "activeBookings": active_bookings,
            "pendingBookings": pending_bookings,
            "todayBookings": today_bookings,
            "cancelledBookings": cancelled_bookings,
            "totalRevenue": float(total_revenue) if total_revenue else 0,
            
            # Recent Bookings
            "recentBookings": {
                "upcoming": [BookingWithPackageResponse.model_validate(b) for b in upcoming_list],
                "completed": [BookingWithPackageResponse.model_validate(b) for b in completed_list]
            },
            
            # Existing complex stats
            "highlights": {
                "mostPopular": most_popular,
                "leastPopular": least_popular
            },
            "packageAnalytics": {
                "mostBooked": most_booked
            },
            "filter": {
                "type": filter_type,
                "start": str(filter_start) if filter_start else None,
                "end": str(filter_end) if filter_end else None
            }
        }
    except Exception as e:
        import traceback
        print(f"Agent Stats Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error loading agent stats: {str(e)}")
