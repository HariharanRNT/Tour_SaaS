from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract, case, desc, and_, or_
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, date
import calendar

from app.database import get_db
from app.models import Booking, Package, User, Payment, PaymentStatus, BookingStatus
from app.api.deps import get_current_agent

router = APIRouter()

@router.get("/summary")
async def get_agent_report_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    period: str = Query("all", regex="^(today|week|month|all|custom)$"),
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(get_current_agent)
):
    """Get summary statistics for the agent's reports"""
    try:
        from datetime import timezone
        now = datetime.now(timezone.utc)
        filter_start = None
        filter_end = None
        prev_start = None
        prev_end = None

        if period == 'today':
            filter_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            prev_start = filter_start - timedelta(days=1)
            prev_end = filter_start
        elif period == 'week':
            filter_start = now - timedelta(days=now.weekday())
            filter_start = filter_start.replace(hour=0, minute=0, second=0, microsecond=0)
            prev_start = filter_start - timedelta(days=7)
            prev_end = filter_start
        elif period == 'month':
            # Changing to last 30 days for better visibility than just calendar month
            filter_start = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
            prev_end = filter_start
            prev_start = filter_start - timedelta(days=30)
        elif period == 'custom' and start_date:
            filter_start = datetime.fromisoformat(start_date)
            if end_date:
                filter_end = datetime.fromisoformat(end_date) + timedelta(days=1)
            
            # For custom, comparing to previous same-length period
            if filter_end:
                duration = filter_end - filter_start
                prev_start = filter_start - duration
                prev_end = filter_start

        async def get_stats(start, end):
            # Revenue
            rev_stmt = select(func.sum(Booking.total_amount)).where(
                Booking.agent_id == current_agent.id,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
            )
            if start: rev_stmt = rev_stmt.where(Booking.created_at >= start)
            if end: rev_stmt = rev_stmt.where(Booking.created_at < end)
            
            # Bookings
            book_stmt = select(func.count(Booking.id)).where(
                Booking.agent_id == current_agent.id
            )
            if start: book_stmt = book_stmt.where(Booking.created_at >= start)
            if end: book_stmt = book_stmt.where(Booking.created_at < end)

            # Cancellations
            cancel_stmt = select(func.count(Booking.id)).where(
                Booking.agent_id == current_agent.id,
                Booking.status == BookingStatus.CANCELLED
            )
            if start: cancel_stmt = cancel_stmt.where(Booking.created_at >= start)
            if end: cancel_stmt = cancel_stmt.where(Booking.created_at < end)

            # Refunds
            refund_stmt = select(func.sum(Booking.refund_amount)).where(
                Booking.agent_id == current_agent.id,
                Booking.status == BookingStatus.CANCELLED
            )
            if start: refund_stmt = refund_stmt.where(Booking.created_at >= start)
            if end: refund_stmt = refund_stmt.where(Booking.created_at < end)

            rev = (await db.execute(rev_stmt)).scalar() or 0
            books = (await db.execute(book_stmt)).scalar() or 0
            cancels = (await db.execute(cancel_stmt)).scalar() or 0
            refunds = (await db.execute(refund_stmt)).scalar() or 0

            return {
                "revenue": float(rev), 
                "bookings": books, 
                "cancellations": cancels,
                "refunds": float(refunds)
            }

        current_stats = await get_stats(filter_start, filter_end)
        prev_stats = await get_stats(prev_start, prev_end)

        def calc_change(curr, prev):
            if prev == 0:
                return "+100%" if curr > 0 else "0%"
            change = ((curr - prev) / prev) * 100
            return f"{'+' if change >= 0 else ''}{round(change, 1)}%"

        return {
            "totalRevenue": current_stats["revenue"],
            "totalBookings": current_stats["bookings"],
            "totalCancellations": current_stats["cancellations"],
            "totalRefunds": current_stats["refunds"],
            "revChange": calc_change(current_stats["revenue"], prev_stats["revenue"]),
            "bookChange": calc_change(current_stats["bookings"], prev_stats["bookings"]),
            "cancelChange": calc_change(current_stats["cancellations"], prev_stats["cancellations"]),
            "refundChange": calc_change(current_stats["refunds"], prev_stats["refunds"]),
            "revUp": current_stats["revenue"] >= prev_stats["revenue"],
            "bookUp": current_stats["bookings"] >= prev_stats["bookings"],
            "cancelUp": current_stats["cancellations"] > prev_stats["cancellations"],
            "refundUp": current_stats["refunds"] > prev_stats["refunds"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/charts")
async def get_agent_report_charts(
    period: str = Query("week", regex="^(today|week|month|all)$"),
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(get_current_agent)
):
    """Get chart data for the agent's reports"""
    try:
        from datetime import timezone
        now = datetime.now(timezone.utc)
        labels = []
        revenue = []
        bookings = []
        cancellations = []

        if period == 'today':
            # Hourly labels for today
            labels = ['9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm']
            start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            for hour in range(9, 18): # 9am to 5pm
                h_start = start_of_day + timedelta(hours=hour)
                h_end = h_start + timedelta(hours=1)
                
                rev_stmt = select(func.sum(Booking.total_amount)).where(
                    Booking.agent_id == current_agent.id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED]),
                    Booking.created_at >= h_start,
                    Booking.created_at < h_end
                )
                book_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.id,
                    Booking.created_at >= h_start,
                    Booking.created_at < h_end
                )
                cancel_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.id,
                    Booking.status == BookingStatus.CANCELLED,
                    Booking.created_at >= h_start,
                    Booking.created_at < h_end
                )
                
                revenue.append(float((await db.execute(rev_stmt)).scalar() or 0))
                bookings.append((await db.execute(book_stmt)).scalar() or 0)
                cancellations.append((await db.execute(cancel_stmt)).scalar() or 0)

        elif period == 'week':
            # Last 7 days
            days = []
            for i in range(6, -1, -1):
                d = (now - timedelta(days=i)).date()
                days.append(d)
                labels.append(d.strftime('%a'))

            for d in days:
                d_start = datetime.combine(d, datetime.min.time())
                d_end = d_start + timedelta(days=1)
                
                rev_stmt = select(func.sum(Booking.total_amount)).where(
                    Booking.agent_id == current_agent.id,
                    Booking.status.in_(['confirmed', 'completed']),
                    Booking.created_at >= d_start,
                    Booking.created_at < d_end
                )
                book_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.id,
                    Booking.created_at >= d_start,
                    Booking.created_at < d_end
                )
                cancel_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.id,
                    Booking.status == 'cancelled',
                    Booking.created_at >= d_start,
                    Booking.created_at < d_end
                )
                
                revenue.append(float((await db.execute(rev_stmt)).scalar() or 0))
                bookings.append((await db.execute(book_stmt)).scalar() or 0)
                cancellations.append((await db.execute(cancel_stmt)).scalar() or 0)

        elif period == 'month':
            # 4 weeks of current month
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
            start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            for i in range(4):
                w_start = start_of_month + timedelta(weeks=i)
                w_end = w_start + timedelta(weeks=1)
                
                rev_stmt = select(func.sum(Booking.total_amount)).where(
                    Booking.agent_id == current_agent.id,
                    Booking.status.in_(['confirmed', 'completed']),
                    Booking.created_at >= w_start,
                    Booking.created_at < w_end
                )
                book_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.id,
                    Booking.created_at >= w_start,
                    Booking.created_at < w_end
                )
                cancel_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.id,
                    Booking.status == 'cancelled',
                    Booking.created_at >= w_start,
                    Booking.created_at < w_end
                )
                
                revenue.append(float((await db.execute(rev_stmt)).scalar() or 0))
                bookings.append((await db.execute(book_stmt)).scalar() or 0)
                cancellations.append((await db.execute(cancel_stmt)).scalar() or 0)

        elif period == 'all':
            # Last 6 months
            for i in range(5, -1, -1):
                # Subtract months is tricky, let's use a simple approach
                first_of_curr_month = now.replace(day=1)
                target_month = first_of_curr_month
                for _ in range(i):
                    target_month = (target_month - timedelta(days=1)).replace(day=1)
                
                m_start = target_month.replace(hour=0, minute=0, second=0, microsecond=0)
                # End is first of next month
                if m_start.month == 12:
                    m_end = m_start.replace(year=m_start.year + 1, month=1)
                else:
                    m_end = m_start.replace(month=m_start.month + 1)
                
                labels.append(m_start.strftime('%b'))
                
                rev_stmt = select(func.sum(Booking.total_amount)).where(
                    Booking.agent_id == current_agent.id,
                    Booking.status.in_(['confirmed', 'completed']),
                    Booking.created_at >= m_start,
                    Booking.created_at < m_end
                )
                book_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.id,
                    Booking.created_at >= m_start,
                    Booking.created_at < m_end
                )
                cancel_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.id,
                    Booking.status == 'cancelled',
                    Booking.created_at >= m_start,
                    Booking.created_at < m_end
                )
                
                revenue.append(float((await db.execute(rev_stmt)).scalar() or 0))
                bookings.append((await db.execute(book_stmt)).scalar() or 0)
                cancellations.append((await db.execute(cancel_stmt)).scalar() or 0)

        # Revenue by Package (Top 5)
        pkg_stmt = select(
            Package.title,
            func.sum(Booking.total_amount).label('revenue')
        ).join(Booking, Package.id == Booking.package_id).where(
            Booking.agent_id == current_agent.id,
            Booking.status.in_(['confirmed', 'completed'])
        ).group_by(Package.id, Package.title).order_by(desc('revenue')).limit(5)
        
        pkg_result = await db.execute(pkg_stmt)
        packages = [{"name": row[0], "value": float(row[1])} for row in pkg_result]

        return {
            "labels": labels,
            "revenue": revenue,
            "bookings": bookings,
            "cancellations": cancellations,
            "packages": packages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/packages")
async def get_agent_package_performance(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    period: str = Query("all", regex="^(today|week|month|all|custom)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("revenue"),
    sort_dir: str = Query("desc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(get_current_agent)
):
    """Get performance metrics for each package owned by the agent with pagination"""
    try:
        from datetime import timezone
        now = datetime.now(timezone.utc)
        filter_start = None
        filter_end = None

        if period == 'today':
            filter_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'week':
            filter_start = now - timedelta(days=now.weekday())
            filter_start = filter_start.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'month':
            filter_start = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'custom' and start_date:
            filter_start = datetime.fromisoformat(start_date)
            if end_date:
                filter_end = datetime.fromisoformat(end_date) + timedelta(days=1)

        # Get total count of packages for the agent
        count_stmt = select(func.count(Package.id)).where(Package.created_by == current_agent.id)
        total_count = (await db.execute(count_stmt)).scalar() or 0

        # Get all packages for the agent (we need to compute metrics first, then sort)
        # Note: True server-side sorting for computed fields like 'conversion' or 'revenue' 
        # in a single SQL query would require complex joins/subqueries.
        # For now, we'll fetch all agent packages, compute metrics, then slice for pagination.
        # In a very large scale system, these metrics would be pre-calculated/cached.
        
        # Get all packages that the agent has bookings for, or created themselves
        pkg_query = select(Package).where(
            or_(
                Package.created_by == current_agent.id,
                Package.id.in_(
                    select(Booking.package_id).where(Booking.agent_id == current_agent.id)
                )
            )
        )
        pkg_result = await db.execute(pkg_query)
        packages = pkg_result.scalars().all()

        performance_data = []
        for pkg in packages:
            # Metrics (filtered by current agent)
            bookings_count_stmt = select(func.count(Booking.id)).where(
                Booking.package_id == pkg.id,
                Booking.agent_id == current_agent.id
            )
            if filter_start: 
                bookings_count_stmt = bookings_count_stmt.where(Booking.created_at >= filter_start)
            
            bookings_count = (await db.execute(bookings_count_stmt)).scalar() or 0
            
            revenue_stmt = select(func.sum(Booking.total_amount)).where(
                Booking.package_id == pkg.id,
                Booking.agent_id == current_agent.id,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
            )
            if filter_start: revenue_stmt = revenue_stmt.where(Booking.created_at >= filter_start)
            if filter_end: revenue_stmt = revenue_stmt.where(Booking.created_at < filter_end)
            
            cancel_count_stmt = select(func.count(Booking.id)).where(
                Booking.package_id == pkg.id,
                Booking.agent_id == current_agent.id,
                Booking.status == BookingStatus.CANCELLED
            )
            if filter_start: cancel_count_stmt = cancel_count_stmt.where(Booking.created_at >= filter_start)
            if filter_end: cancel_count_stmt = cancel_count_stmt.where(Booking.created_at < filter_end)

            bookings_count = (await db.execute(bookings_count_stmt)).scalar() or 0
            revenue = (await db.execute(revenue_stmt)).scalar() or 0
            cancel_count = (await db.execute(cancel_count_stmt)).scalar() or 0

            cancel_pct = (cancel_count / bookings_count * 100) if bookings_count > 0 else 0
            conversion = (bookings_count / pkg.view_count * 100) if (pkg.view_count or 0) > 0 else 0

            performance_data.append({
                "id": str(pkg.id),
                "name": pkg.title,
                "sublabel": f"{pkg.duration_days}D/{pkg.duration_nights}N • {pkg.destination}",
                "status": pkg.status.value if hasattr(pkg.status, 'value') else str(pkg.status),
                "views": pkg.view_count or 0,
                "bookings": bookings_count,
                "revenue": float(revenue),
                "cancel_pct": round(cancel_pct, 1),
                "conversion": round(conversion, 1)
            })

        # Sort the data
        reverse = sort_dir == "desc"
        performance_data.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse)

        # Pagination slice
        start = (page - 1) * limit
        end = start + limit
        paginated_items = performance_data[start:end]

        return {
            "items": paginated_items,
            "total": total_count,
            "page": page,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
