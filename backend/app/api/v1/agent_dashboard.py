"""Agent Dashboard API endpoints for market insights"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc
from uuid import UUID

from app.database import get_db
from app.models import Package, Booking, User, UserRole
from app.api.deps import get_current_agent

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
        elif filter_type == 'CUSTOM' and start_date:
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
            Package.status == 'published'
        )
        pub_query = apply_date_filter(pub_query, Package.created_at)
        res = await db.execute(pub_query)
        published_packages = res.scalar() or 0
        
        # Drafts
        draft_query = select(func.count(Package.id)).where(
            Package.created_by == current_agent.id,
            Package.status == 'draft'
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
        
        # Active (Confirmed or Pending)
        active_query = select(func.count(Booking.id)).where(
            Booking.agent_id == current_agent.id,
            Booking.status.in_(['confirmed', 'pending'])
        )
        active_query = apply_date_filter(active_query, Booking.created_at)
        res = await db.execute(active_query)
        active_bookings = res.scalar() or 0
        
        # Pending Only
        pending_query = select(func.count(Booking.id)).where(
            Booking.agent_id == current_agent.id,
            Booking.status == 'pending'
        )
        pending_query = apply_date_filter(pending_query, Booking.created_at)
        res = await db.execute(pending_query)
        pending_bookings = res.scalar() or 0
        
        # Revenue (Confirmed/Completed)
        rev_query = select(func.sum(Booking.total_amount)).where(
            Booking.agent_id == current_agent.id,
            Booking.status.in_(['confirmed', 'completed'])
        )
        rev_query = apply_date_filter(rev_query, Booking.created_at)
        res = await db.execute(rev_query)
        total_revenue = res.scalar() or 0

        # --- 2. Benchmark/Highlights (Filtered) ---
        
        # 1. My Top Performer (Agent's Most Booked Package in Period)
        stmt = select(
            Package.id,
            Package.title,
            func.count(Booking.id).label('count')
        ).join(Booking, Package.id == Booking.package_id).where(
            Booking.agent_id == current_agent.id
        )
        # Apply filter to bookings
        stmt = apply_date_filter(stmt, Booking.created_at)
        
        stmt = stmt.group_by(Package.id).order_by(desc('count')).limit(1)
        
        result = await db.execute(stmt)
        most_popular_row = result.first()
        most_popular = None
        
        if most_popular_row:
             pkg_id, pkg_title, pkg_count = most_popular_row
             
             # Metric: Agent Sales for this package (Simple sum)
             # We rely on the filtered 'pkg_count' as the sales count for this period
             agent_sales = pkg_count # Since query is filtered by agent_id and date already
             
             # Global Top Agent (Maybe too complex to filter dynamically? 
             # Let's show "Review" or just keep local stats for now to be fast)
             # keeping simple
             most_popular = {
                 "title": pkg_title,
                 "bookings": pkg_count,
                 "top_agent": "N/A",
                 "agent_sales": agent_sales
             }

        # 2. My Lowest Traction
        stmt = select(
            Package.id,
            Package.title,
            func.count(Booking.id).label('count')
        ).join(Booking, Package.id == Booking.package_id).where(
            Booking.agent_id == current_agent.id
        )
        stmt = apply_date_filter(stmt, Booking.created_at)
        stmt = stmt.group_by(Package.id).order_by(asc('count')).limit(1)
        
        result = await db.execute(stmt)
        least_popular_row = result.first()
        least_popular = None
        
        if least_popular_row:
             pkg_id, pkg_title, pkg_count = least_popular_row
             least_popular = {
                 "title": pkg_title,
                 "bookings": pkg_count,
                 "top_agent": "N/A",
                 "agent_sales": pkg_count
             }

        # 3. My Most Booked Packages List
        stmt = select(
            Package.title,
            func.count(Booking.id).label('count')
        ).outerjoin(Booking, Package.id == Booking.package_id).where(
            Booking.agent_id == current_agent.id
        )
        stmt = apply_date_filter(stmt, Booking.created_at)
        stmt = stmt.group_by(Package.id).order_by(desc('count')).limit(5)
        
        result = await db.execute(stmt)
        most_booked = [{"title": row[0], "bookings": row[1]} for row in result]

        return {
            # New direct stats
            "totalPackages": total_packages,
            "publishedPackages": published_packages,
            "draftPackages": draft_packages,
            "totalBookings": total_bookings,
            "activeBookings": active_bookings,
            "pendingBookings": pending_bookings,
            "totalRevenue": float(total_revenue) if total_revenue else 0,
            
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
