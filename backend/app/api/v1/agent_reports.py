from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract, case, desc, and_, or_
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, date
import calendar

from app.database import get_db
from app.models import Booking, Package, User, Payment, PaymentStatus, BookingStatus
from app.api.deps import get_current_agent, check_permission

router = APIRouter()

@router.get("/summary")
async def get_agent_report_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    period: str = Query("all", regex="^(today|week|month|ytm|all|custom)$"),
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("finance_reports", "view"))
):
    """Get summary statistics for the agent's reports"""
    try:
        from datetime import timezone, timedelta
        IST = timezone(timedelta(hours=5, minutes=30))
        now = datetime.now(IST)
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
        elif period == 'ytm':
            filter_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            # For YTM, comparing to same period last year
            prev_start = filter_start - timedelta(days=365)
            # prev_end would be same relative day last year
            prev_end = now - timedelta(days=365)
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
            rev_stmt = select(func.sum(Booking.total_amount - func.coalesce(Booking.refund_amount, 0))).where(
                Booking.agent_id == current_agent.agent_id,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID])
            )
            if start: rev_stmt = rev_stmt.where(Booking.created_at >= start)
            if end: rev_stmt = rev_stmt.where(Booking.created_at < end)
            
            # Bookings
            book_stmt = select(func.count(Booking.id)).where(
                Booking.agent_id == current_agent.agent_id, 
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID])
            )
            if start: book_stmt = book_stmt.where(Booking.created_at >= start)
            if end: book_stmt = book_stmt.where(Booking.created_at < end)

            # Cancellations
            cancel_stmt = select(func.count(Booking.id)).where(
                Booking.agent_id == current_agent.agent_id,
                Booking.status == BookingStatus.CANCELLED
            )
            if start: cancel_stmt = cancel_stmt.where(Booking.created_at >= start)
            if end: cancel_stmt = cancel_stmt.where(Booking.created_at < end)

            # Refunds
            refund_stmt = select(func.sum(Booking.refund_amount)).where(
                Booking.agent_id == current_agent.agent_id,
                Booking.status == BookingStatus.CANCELLED
            )
            if start: refund_stmt = refund_stmt.where(Booking.created_at >= start)
            if end: refund_stmt = refund_stmt.where(Booking.created_at < end)

            rev = (await db.execute(rev_stmt)).scalar()
            books = (await db.execute(book_stmt)).scalar() or 0
            cancels = (await db.execute(cancel_stmt)).scalar() or 0
            refunds = (await db.execute(refund_stmt)).scalar()

            return {
                "revenue": float(rev or 0), 
                "bookings": books, 
                "cancellations": cancels,
                "refunds": float(refunds or 0)
            }

        current_stats = await get_stats(filter_start, filter_end)
        prev_stats = await get_stats(prev_start, prev_end)

        def calc_change(curr, prev):
            if not prev or prev == 0:
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
        import traceback
        print(f"Error in summary: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Summary error: {str(e)}")

@router.get("/charts")
async def get_agent_report_charts(
    period: str = Query("week", regex="^(today|week|month|ytm|all|custom)$"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(get_current_agent)
):
    """Get chart data for the agent's reports"""
    try:
        from datetime import timezone, timedelta
        IST = timezone(timedelta(hours=5, minutes=30))
        now = datetime.now(IST)
        labels = []
        revenue = []
        bookings = []
        cancellations = []

        filter_start = None
        filter_end = None

        if period == 'today':
            filter_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'week':
            filter_start = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'month':
            filter_start = (now - timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'ytm':
            filter_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == 'custom' and start_date:
            filter_start = datetime.fromisoformat(start_date).replace(tzinfo=IST)
            if end_date:
                filter_end = datetime.fromisoformat(end_date).replace(tzinfo=IST) + timedelta(days=1)

        if period == 'today':
            # Hourly labels for today: 00:00 to 23:00
            start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
            for hour in range(24):
                h_start = start_of_day + timedelta(hours=hour)
                h_end = h_start + timedelta(hours=1)
                labels.append(h_start.strftime('%H:%M'))
                
                rev_stmt = select(func.sum(Booking.total_amount - func.coalesce(Booking.refund_amount, 0))).where(
                    Booking.agent_id == current_agent.agent_id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                    Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                    Booking.created_at >= h_start,
                    Booking.created_at < h_end
                )
                book_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.agent_id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                    Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                    Booking.created_at >= h_start,
                    Booking.created_at < h_end
                )
                cancel_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.agent_id,
                    Booking.status == BookingStatus.CANCELLED,
                    Booking.created_at >= h_start,
                    Booking.created_at < h_end
                )
                
                revenue.append(float((await db.execute(rev_stmt)).scalar() or 0))
                bookings.append((await db.execute(book_stmt)).scalar() or 0)
                cancellations.append((await db.execute(cancel_stmt)).scalar() or 0)

        elif period == 'week':
            # Last 7 days
            for i in range(6, -1, -1):
                d = (now - timedelta(days=i)).date()
                d_start = datetime.combine(d, datetime.min.time(), tzinfo=IST)
                d_end = d_start + timedelta(days=1)
                labels.append(d.strftime('%a'))
                
                rev_stmt = select(func.sum(Booking.total_amount - func.coalesce(Booking.refund_amount, 0))).where(
                    Booking.agent_id == current_agent.agent_id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                    Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                    Booking.created_at >= d_start,
                    Booking.created_at < d_end
                )
                book_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.agent_id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                    Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                    Booking.created_at >= d_start,
                    Booking.created_at < d_end
                )
                cancel_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.agent_id,
                    Booking.status == BookingStatus.CANCELLED,
                    Booking.created_at >= d_start,
                    Booking.created_at < d_end
                )
                
                revenue.append(float((await db.execute(rev_stmt)).scalar() or 0))
                bookings.append((await db.execute(book_stmt)).scalar() or 0)
                cancellations.append((await db.execute(cancel_stmt)).scalar() or 0)

        elif period == 'month':
            # Last 30 days (Daily)
            for i in range(29, -1, -1):
                d = (now - timedelta(days=i)).date()
                d_start = datetime.combine(d, datetime.min.time(), tzinfo=IST)
                d_end = d_start + timedelta(days=1)
                labels.append(d.strftime('%d %b'))
                
                rev_stmt = select(func.sum(Booking.total_amount - func.coalesce(Booking.refund_amount, 0))).where(
                    Booking.agent_id == current_agent.agent_id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                    Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                    Booking.created_at >= d_start,
                    Booking.created_at < d_end
                )
                book_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.agent_id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                    Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                    Booking.created_at >= d_start,
                    Booking.created_at < d_end
                )
                cancel_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.agent_id,
                    Booking.status == BookingStatus.CANCELLED,
                    Booking.created_at >= d_start,
                    Booking.created_at < d_end
                )
                
                revenue.append(float((await db.execute(rev_stmt)).scalar() or 0))
                bookings.append((await db.execute(book_stmt)).scalar() or 0)
                cancellations.append((await db.execute(cancel_stmt)).scalar() or 0)

        elif period == 'ytm' or (period == 'all' and not start_date):
            # Year-To-Month (YTM): January to current month
            current_year = now.year
            current_month = now.month
            
            for m in range(1, current_month + 1):
                m_start = datetime(current_year, m, 1, tzinfo=IST)
                if m == 12:
                    m_end = datetime(current_year + 1, 1, 1, tzinfo=IST)
                else:
                    m_end = datetime(current_year, m + 1, 1, tzinfo=IST)
                
                labels.append(m_start.strftime('%b'))
                
                rev_stmt = select(func.sum(Booking.total_amount - func.coalesce(Booking.refund_amount, 0))).where(
                    Booking.agent_id == current_agent.agent_id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                    Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                    Booking.created_at >= m_start,
                    Booking.created_at < m_end
                )
                book_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.agent_id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                    Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                    Booking.created_at >= m_start,
                    Booking.created_at < m_end
                )
                cancel_stmt = select(func.count(Booking.id)).where(
                    Booking.agent_id == current_agent.agent_id,
                    Booking.status == BookingStatus.CANCELLED,
                    Booking.created_at >= m_start,
                    Booking.created_at < m_end
                )
                
                revenue.append(float((await db.execute(rev_stmt)).scalar() or 0))
                bookings.append((await db.execute(book_stmt)).scalar() or 0)
                cancellations.append((await db.execute(cancel_stmt)).scalar() or 0)

        elif period == 'custom' and start_date and end_date:
            # Custom range auto-detect granularity
            s = datetime.fromisoformat(start_date).replace(tzinfo=IST)
            e = datetime.fromisoformat(end_date).replace(tzinfo=IST) + timedelta(days=1)
            delta = e - s
            
            if delta.days <= 1:
                # Hourly
                for hour in range(24):
                    h_start = s + timedelta(hours=hour)
                    h_end = h_start + timedelta(hours=1)
                    labels.append(h_start.strftime('%H:%M'))
                    
                    rev_stmt = select(func.sum(Booking.total_amount - func.coalesce(Booking.refund_amount, 0))).where(
                        Booking.agent_id==current_agent.agent_id, 
                        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                        Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                        Booking.created_at >= h_start, 
                        Booking.created_at < h_end
                    )
                    book_stmt = select(func.count(Booking.id)).where(
                        Booking.agent_id==current_agent.agent_id, 
                        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                        Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                        Booking.created_at >= h_start, 
                        Booking.created_at < h_end
                    )
                    cancel_stmt = select(func.count(Booking.id)).where(
                        Booking.agent_id==current_agent.agent_id, 
                        Booking.status == BookingStatus.CANCELLED,
                        Booking.created_at >= h_start, 
                        Booking.created_at < h_end
                    )
                    
                    revenue.append(float((await db.execute(rev_stmt)).scalar() or 0))
                    bookings.append((await db.execute(book_stmt)).scalar() or 0)
                    cancellations.append((await db.execute(cancel_stmt)).scalar() or 0)
            elif delta.days <= 31:
                # Daily
                for i in range(delta.days):
                    d_start = s + timedelta(days=i)
                    d_end = d_start + timedelta(days=1)
                    labels.append(d_start.strftime('%d %b'))
                    
                    rev_stmt = select(func.sum(Booking.total_amount - func.coalesce(Booking.refund_amount, 0))).where(
                        Booking.agent_id==current_agent.agent_id, 
                        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                        Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                        Booking.created_at >= d_start, 
                        Booking.created_at < d_end
                    )
                    book_stmt = select(func.count(Booking.id)).where(
                        Booking.agent_id==current_agent.agent_id, 
                        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                        Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                        Booking.created_at >= d_start, 
                        Booking.created_at < d_end
                    )
                    cancel_stmt = select(func.count(Booking.id)).where(
                        Booking.agent_id==current_agent.agent_id, 
                        Booking.status == BookingStatus.CANCELLED,
                        Booking.created_at >= d_start, 
                        Booking.created_at < d_end
                    )
                    
                    revenue.append(float((await db.execute(rev_stmt)).scalar() or 0))
                    bookings.append((await db.execute(book_stmt)).scalar() or 0)
                    cancellations.append((await db.execute(cancel_stmt)).scalar() or 0)
            else:
                # Monthly
                curr = s.replace(day=1)
                while curr < e:
                    m_start = curr
                    if curr.month == 12:
                        m_end = datetime(curr.year+1, 1, 1, tzinfo=IST)
                    else:
                        m_end = datetime(curr.year, curr.month+1, 1, tzinfo=IST)
                    labels.append(m_start.strftime('%b %y'))
                    
                    rev_stmt = select(func.sum(Booking.total_amount - func.coalesce(Booking.refund_amount, 0))).where(
                        Booking.agent_id==current_agent.agent_id, 
                        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                        Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                        Booking.created_at >= m_start, 
                        Booking.created_at < m_end
                    )
                    book_stmt = select(func.count(Booking.id)).where(
                        Booking.agent_id==current_agent.agent_id, 
                        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                        Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                        Booking.created_at >= m_start, 
                        Booking.created_at < m_end
                    )
                    cancel_stmt = select(func.count(Booking.id)).where(
                        Booking.agent_id==current_agent.agent_id, 
                        Booking.status == BookingStatus.CANCELLED,
                        Booking.created_at >= m_start, 
                        Booking.created_at < m_end
                    )
                    
                    revenue.append(float((await db.execute(rev_stmt)).scalar() or 0))
                    bookings.append((await db.execute(book_stmt)).scalar() or 0)
                    cancellations.append((await db.execute(cancel_stmt)).scalar() or 0)
                    curr = m_end

        # Default fallback for 'all' if no start_date and not handled above
        if not labels:
             # Full history (6 months fallback or similar)
            for i in range(5, -1, -1):
                start = (now - timedelta(days=i*30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if start.month == 12:
                    end = datetime(start.year+1, 1, 1, tzinfo=IST)
                else:
                    end = datetime(start.year, start.month+1, 1, tzinfo=IST)
                labels.append(start.strftime('%b %Y'))
                rev_stmt = select(func.sum(Booking.total_amount - func.coalesce(Booking.refund_amount, 0))).where(Booking.agent_id==current_agent.agent_id, Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]), Booking.created_at >= start, Booking.created_at < end)
                book_stmt = select(func.count(Booking.id)).where(Booking.agent_id==current_agent.agent_id, Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]), Booking.created_at >= start, Booking.created_at < end)
                cancel_stmt = select(func.count(Booking.id)).where(Booking.agent_id==current_agent.agent_id, Booking.status == BookingStatus.CANCELLED, Booking.created_at >= start, Booking.created_at < end)

                revenue.append(float((await db.execute(rev_stmt)).scalar() or 0))
                bookings.append((await db.execute(book_stmt)).scalar() or 0)
                cancellations.append((await db.execute(cancel_stmt)).scalar() or 0)

        # Top 5 Packages by Sales
        pkg_stmt = select(
            Package.title,
            func.count(Booking.id).label('sales')
        ).join(Booking, Package.id == Booking.package_id).where(
            Booking.agent_id == current_agent.agent_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
            Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID])
        )

        if filter_start:
            pkg_stmt = pkg_stmt.where(Booking.created_at >= filter_start)
        if filter_end:
            pkg_stmt = pkg_stmt.where(Booking.created_at < filter_end)

        pkg_stmt = pkg_stmt.group_by(Package.id, Package.title).order_by(desc('sales')).limit(5)
        
        pkg_result = await db.execute(pkg_stmt)
        packages = [{"name": row[0], "value": float(row[1])} for row in pkg_result]

        return {
            "labels": labels,
            "revenue": revenue,
            "bookings": bookings or [0]*len(labels),
            "cancellations": cancellations or [0]*len(labels),
            "packages": packages
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/packages")
async def get_agent_package_performance(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    period: str = Query("all", regex="^(today|week|month|ytm|all|custom)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=1000),
    sort_by: str = Query("revenue"),
    sort_dir: str = Query("desc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("finance_reports", "view"))
):
    """Get performance metrics for each package owned by the agent with pagination"""
    try:
        from datetime import timezone, timedelta
        IST = timezone(timedelta(hours=5, minutes=30))
        now = datetime.now(IST)
        filter_start = None
        filter_end = None

        if period == 'today':
            filter_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'week':
            filter_start = now - timedelta(days=now.weekday())
            filter_start = filter_start.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'month':
            filter_start = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'ytm':
            filter_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == 'custom' and start_date:
            filter_start = datetime.fromisoformat(start_date)
            if end_date:
                filter_end = datetime.fromisoformat(end_date) + timedelta(days=1)

        # Get total count of packages for the agent
        count_stmt = select(func.count(Package.id)).where(Package.created_by == current_agent.agent_id)
        total_count = (await db.execute(count_stmt)).scalar() or 0

        # Get all packages for the agent (we need to compute metrics first, then sort)
        # Note: True server-side sorting for computed fields like 'conversion' or 'revenue' 
        # in a single SQL query would require complex joins/subqueries.
        # For now, we'll fetch all agent packages, compute metrics, then slice for pagination.
        # In a very large scale system, these metrics would be pre-calculated/cached.
        
        # Use a subquery for metrics aggregation to avoid grouping by JSON columns (Postgres restriction)
        metrics_stmt = select(
            Package.id.label('pkg_id'),
            func.count(Booking.id).label('total_bookings'),
            func.sum(
                case(
                    (and_(
                        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                        Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                        or_(
                            Package.created_by == current_agent.agent_id,
                            Booking.agent_id == current_agent.agent_id
                        )
                    ), Booking.total_amount - func.coalesce(Booking.refund_amount, 0)),
                    else_=0
                )
            ).label('revenue'),
            func.sum(
                case(
                    (and_(
                        Booking.status == BookingStatus.CANCELLED,
                        or_(
                            Package.created_by == current_agent.agent_id,
                            Booking.agent_id == current_agent.agent_id
                        )
                    ), 1),
                    else_=0
                )
            ).label('cancellations'),
            func.count(
                case(
                    (and_(
                        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
                        Booking.payment_status.in_([PaymentStatus.SUCCEEDED, PaymentStatus.PAID]),
                        or_(
                            Package.created_by == current_agent.agent_id,
                            Booking.agent_id == current_agent.agent_id
                        )
                    ), Booking.id),
                    else_=None
                )
            ).label('relevant_bookings_count')
        ).outerjoin(
            Booking, Package.id == Booking.package_id
        ).where(
            or_(
                Package.created_by == current_agent.agent_id,
                Package.id.in_(
                    select(Booking.package_id).where(Booking.agent_id == current_agent.agent_id)
                )
            )
        )

        if filter_start:
            metrics_stmt = metrics_stmt.where(or_(Booking.created_at >= filter_start, Booking.id == None))
        if filter_end:
            metrics_stmt = metrics_stmt.where(or_(Booking.created_at < filter_end, Booking.id == None))

        metrics_subquery = metrics_stmt.group_by(Package.id).subquery()

        # Join Package metadata with metrics subquery
        stmt = select(
            Package,
            metrics_subquery.c.total_bookings,
            metrics_subquery.c.revenue,
            metrics_subquery.c.cancellations,
            metrics_subquery.c.relevant_bookings_count
        ).join(
            metrics_subquery, Package.id == metrics_subquery.c.pkg_id
        )

        result = await db.execute(stmt)
        rows = result.all()

        performance_data = []
        for row in rows:
            pkg = row[0]
            bookings_count = row.relevant_bookings_count or 0
            revenue = row.revenue or 0
            cancel_count = row.cancellations or 0

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
        import traceback
        traceback_str = traceback.format_exc()
        print(f"ERROR get_agent_package_performance: {str(e)}")
        print(traceback_str)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/financial")
async def get_agent_financial_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    period: str = Query("all", regex="^(today|week|month|ytm|all|custom)$"),
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(check_permission("finance_reports", "view"))
):
    """Get financial metrics aggregated by date for the agent"""
    try:
        from datetime import timezone, timedelta
        IST = timezone(timedelta(hours=5, minutes=30))
        now = datetime.now(IST)
        filter_start = None
        filter_end = None

        if period == 'today':
            filter_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'week':
            filter_start = now - timedelta(days=now.weekday())
            filter_start = filter_start.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'month':
            filter_start = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'ytm':
            filter_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == 'custom' and start_date:
            filter_start = datetime.fromisoformat(start_date).replace(tzinfo=IST)
            if end_date:
                filter_end = datetime.fromisoformat(end_date).replace(tzinfo=IST) + timedelta(days=1)

        # Base query for bookings
        query = select(Booking).where(Booking.agent_id == current_agent.agent_id)
        if filter_start:
            query = query.where(Booking.created_at >= filter_start)
        if filter_end:
            query = query.where(Booking.created_at < filter_end)
        
        result = await db.execute(query)
        bookings = result.scalars().all()

        # Aggregate by date
        financial_data = {}
        
        # Get agent for GST settings
        from app.models import Agent
        agent_stmt = select(Agent).where(Agent.user_id == current_agent.agent_id)
        agent_result = await db.execute(agent_stmt)
        agent_obj = agent_result.scalar_one_or_none()
        
        default_gst = 18.0
        default_inclusive = False
        if agent_obj:
            default_gst = float(agent_obj.gst_percentage or 18.0)
            default_inclusive = agent_obj.gst_inclusive or False

        for b in bookings:
            # Safety check: if created_at is null, skip or use a fallback
            if not b.created_at:
                continue
                
            # Convert UTC created_at to IST before extracting date
            ist_dt = b.created_at.astimezone(IST)
            d_str = ist_dt.date().isoformat()
            if d_str not in financial_data:
                financial_data[d_str] = {
                    "date": d_str,
                    "total_bookings": 0,
                    "gross_revenue": 0.0,
                    "discounts": 0.0, # Placeholder
                    "net_revenue": 0.0,
                    "refund_amount": 0.0,
                    "taxes": 0.0,
                    "final_earnings": 0.0
                }
            
            stats = financial_data[d_str]
            if b.status in [BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED] and b.payment_status in [PaymentStatus.SUCCEEDED, PaymentStatus.PAID]:
                stats["total_bookings"] += 1 # Count all paid bookings including cancelled ones
                amount = float(b.total_amount)
                refund = float(b.refund_amount or 0.0)
                stats["gross_revenue"] += amount
                stats["refund_amount"] += refund
                
                # GST Calculation (simulating the breakdown)
                # If total_amount was inclusive, taxes = total * (gst / (100+gst))
                # If total_amount was exclusive, total = base + tax -> tax = total - (total / (1 + (gst/100)))
                # Since we don't store if a specific booking was inclusive/exclusive, we use agent default
                # Tax should ideally be calculated on the net amount (amount - refund)
                net_amount = amount - refund
                tax = 0.0
                if default_inclusive:
                    tax = net_amount * (default_gst / (100 + default_gst))
                else:
                    tax = net_amount - (net_amount / (1 + (default_gst / 100)))
                
                stats["taxes"] += tax
                stats["net_revenue"] += net_amount
                stats["final_earnings"] += (net_amount - tax)
                # According to example: Final Earnings = Net Revenue - Taxes.
                # Let's keep it simple as per example.

        # Convert to list and sort by date desc
        report_list = list(financial_data.values())
        report_list.sort(key=lambda x: x["date"], reverse=True)

        return report_list
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
