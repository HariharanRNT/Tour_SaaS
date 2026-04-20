"""
Admin API: Centralized API Logs
Endpoints:
  GET    /api/v1/admin-simple/logs         - Paginated + filtered list
  GET    /api/v1/admin-simple/logs/stats   - Summary statistics
  GET    /api/v1/admin-simple/logs/{id}    - Full detail for one log
  DELETE /api/v1/admin-simple/logs/purge   - Delete logs older than N days
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, or_, delete as sa_delete
from sqlalchemy.dialects import sqlite as sa_sqlite
from typing import Optional
from datetime import datetime, timedelta
import uuid

from app.database import get_db
from app.models import APILog

router = APIRouter()


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _log_to_dict(log: APILog, detail: bool = False) -> dict:
    """Serialize an APILog model instance to a plain dict."""
    base = {
        "id":           str(log.id),
        "method":       log.method,
        "endpoint":     log.endpoint,
        "status_code":  log.status_code,
        "status":       log.status,
        "duration_ms":  log.duration_ms,
        "error_type":   log.error_type,
        "user_role":    log.user_role,
        "ip_address":   log.ip_address,
        "created_at":   log.created_at.isoformat() if log.created_at else None,
    }
    if detail:
        base.update({
            "query_params":     log.query_params,
            "request_body":     log.request_body,
            "request_headers":  log.request_headers,
            "response_body":    log.response_body,
            "error_message":    log.error_message,
            "stack_trace":      log.stack_trace,
            "user_id":          str(log.user_id) if log.user_id else None,
            "user_agent":       log.user_agent,
        })
    else:
        base["error_message"] = (
            (log.error_message[:120] + "…") if log.error_message and len(log.error_message) > 120
            else log.error_message
        )
    return base


def _apply_filters(query, status, method, error_type, date_from, date_to, search):
    """Apply all optional WHERE clauses to a select() statement."""
    if status:
        query = query.where(APILog.status == status)
    if method:
        methods = [m.strip().upper() for m in method.split(",") if m.strip()]
        if methods:
            query = query.where(APILog.method.in_(methods))
    if error_type:
        query = query.where(APILog.error_type == error_type)
    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.where(APILog.created_at >= dt_from)
        except ValueError:
            pass
    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
            query = query.where(APILog.created_at < dt_to)
        except ValueError:
            pass
    if search:
        query = query.where(APILog.endpoint.ilike(f"%{search}%"))
    return query


# ──────────────────────────────────────────────────────────────
# GET /logs — paginated, filtered list
# ──────────────────────────────────────────────────────────────

@router.get("/logs")
async def list_logs(
    status:     Optional[str] = Query(None, description="success | error"),
    method:     Optional[str] = Query(None, description="Comma-separated: GET,POST,PUT,DELETE,PATCH"),
    error_type: Optional[str] = Query(None, description="validation|auth|server|not_found|rate_limit"),
    date_from:  Optional[str] = Query(None, description="YYYY-MM-DD"),
    date_to:    Optional[str] = Query(None, description="YYYY-MM-DD"),
    search:     Optional[str] = Query(None, description="Endpoint keyword"),
    page:       int           = Query(1,   ge=1),
    limit:      int           = Query(50,  ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Return paginated API logs with optional filters."""
    try:
        base_q = select(APILog)
        base_q = _apply_filters(base_q, status, method, error_type, date_from, date_to, search)

        # Count total
        count_q = select(func.count()).select_from(base_q.subquery())
        total_res = await db.execute(count_q)
        total = total_res.scalar() or 0

        # Fetch page
        offset = (page - 1) * limit
        data_q = base_q.order_by(desc(APILog.created_at)).offset(offset).limit(limit)
        result = await db.execute(data_q)
        logs = result.scalars().all()

        return {
            "total":        total,
            "page":         page,
            "limit":        limit,
            "total_pages":  max(1, (total + limit - 1) // limit),
            "data":         [_log_to_dict(log) for log in logs],
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error fetching logs: {str(e)}")


# ──────────────────────────────────────────────────────────────
# GET /logs/stats — summary statistics
# ──────────────────────────────────────────────────────────────

@router.get("/logs/stats")
async def get_log_stats(
    date_from: Optional[str] = Query(None),
    date_to:   Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Return high-level summary: total, success, error counts, avg duration, method breakdown."""
    try:
        def _dt_filter(q):
            if date_from:
                try:
                    q = q.where(APILog.created_at >= datetime.strptime(date_from, "%Y-%m-%d"))
                except ValueError:
                    pass
            if date_to:
                try:
                    q = q.where(APILog.created_at < datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1))
                except ValueError:
                    pass
            return q

        # Totals
        total_q = _dt_filter(select(func.count(APILog.id)))
        total_res = await db.execute(total_q)
        total = total_res.scalar() or 0

        success_q = _dt_filter(select(func.count(APILog.id)).where(APILog.status == "success"))
        success_res = await db.execute(success_q)
        success_count = success_res.scalar() or 0

        error_count = total - success_count
        success_rate = round((success_count / total * 100), 1) if total > 0 else 0

        # Avg duration
        avg_q = _dt_filter(select(func.avg(APILog.duration_ms)))
        avg_res = await db.execute(avg_q)
        avg_duration = round(avg_res.scalar() or 0, 2)

        # Method breakdown
        method_q = _dt_filter(
            select(APILog.method, func.count(APILog.id).label("count"))
            .group_by(APILog.method)
            .order_by(desc("count"))
        )
        method_res = await db.execute(method_q)
        method_breakdown = [{"method": row[0], "count": row[1]} for row in method_res.all()]

        # Error type breakdown
        err_type_q = _dt_filter(
            select(APILog.error_type, func.count(APILog.id).label("count"))
            .where(APILog.status == "error", APILog.error_type.isnot(None))
            .group_by(APILog.error_type)
            .order_by(desc("count"))
        )
        err_type_res = await db.execute(err_type_q)
        error_breakdown = [{"error_type": row[0], "count": row[1]} for row in err_type_res.all()]

        # Recent trend (last 7 days, daily counts)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        trend_q = (
            select(APILog.created_at, APILog.status)
            .where(APILog.created_at >= seven_days_ago)
        )
        trend_res = await db.execute(trend_q)
        daily: dict = {}
        for row in trend_res.all():
            if row[0]:
                day_key = row[0].strftime("%Y-%m-%d")
                if day_key not in daily:
                    daily[day_key] = {"date": day_key, "total": 0, "success": 0, "error": 0}
                daily[day_key]["total"] += 1
                daily[day_key][row[1]] += 1
        # Fill missing days
        for i in range(6, -1, -1):
            dk = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
            if dk not in daily:
                daily[dk] = {"date": dk, "total": 0, "success": 0, "error": 0}
        trend_data = sorted(daily.values(), key=lambda x: x["date"])

        return {
            "total":            total,
            "success_count":    success_count,
            "error_count":      error_count,
            "success_rate":     success_rate,
            "avg_duration_ms":  avg_duration,
            "method_breakdown": method_breakdown,
            "error_breakdown":  error_breakdown,
            "trend":            trend_data,
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error fetching log stats: {str(e)}")


# ──────────────────────────────────────────────────────────────
# GET /logs/{log_id} — full detail
# ──────────────────────────────────────────────────────────────

@router.get("/logs/{log_id}")
async def get_log_detail(
    log_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return complete details for a single log entry."""
    try:
        try:
            log_uuid = uuid.UUID(log_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid log ID format")

        result = await db.execute(select(APILog).where(APILog.id == log_uuid))
        log = result.scalar_one_or_none()
        if not log:
            raise HTTPException(status_code=404, detail="Log not found")
        return _log_to_dict(log, detail=True)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching log: {str(e)}")


# ──────────────────────────────────────────────────────────────
# DELETE /logs/{log_id} — delete a specific log
# ──────────────────────────────────────────────────────────────

@router.delete("/logs/{log_id}")
async def delete_log(
    log_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single log entry."""
    try:
        try:
            log_uuid = uuid.UUID(log_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid log ID format")

        stmt = sa_delete(APILog).where(APILog.id == log_uuid)
        result = await db.execute(stmt)
        await db.commit()

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Log not found")

        return {"message": "Log deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting log: {str(e)}")


# ──────────────────────────────────────────────────────────────
# DELETE /logs/purge — housekeeping
# ──────────────────────────────────────────────────────────────

@router.delete("/logs/purge")
async def purge_old_logs(
    older_than_days: int = Query(30, ge=1, description="Delete logs older than this many days"),
    db: AsyncSession = Depends(get_db),
):
    """Delete log entries older than `older_than_days` days."""
    try:
        from sqlalchemy import delete as sa_delete
        cutoff = datetime.utcnow() - timedelta(days=older_than_days)
        count_q = select(func.count(APILog.id)).where(APILog.created_at < cutoff)
        count_res = await db.execute(count_q)
        total_to_delete = count_res.scalar() or 0

        del_q = sa_delete(APILog).where(APILog.created_at < cutoff)
        await db.execute(del_q)
        await db.commit()

        return {
            "message": f"Deleted {total_to_delete} log(s) older than {older_than_days} day(s).",
            "deleted_count": total_to_delete,
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error purging logs: {str(e)}")
