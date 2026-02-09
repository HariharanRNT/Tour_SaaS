"""Simplified admin API endpoints that work"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, case as sql_case
from uuid import UUID
import uuid
import json

from app.database import get_db
from app.database import get_db
from app.models import Package, PackageStatus, ItineraryItem, Booking, User, UserRole, BookingStatus, Payment, PaymentStatus, Agent, Subscription
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
        
        # 3. Total Revenue (Confirmed + Completed)
        # Assuming BookingStatus has CONFIRMED and COMPLETED
        rev_stmt = select(func.sum(Booking.total_amount)).where(
            Booking.status.in_([BookingStatus.CONFIRMED.value, BookingStatus.COMPLETED.value])
        )
        rev_stmt = apply_date_filter(rev_stmt, Booking.created_at)
        
        result = await db.execute(rev_stmt)
        total_revenue = result.scalar() or 0
        
        # 4. Agents Stats (Usually total, not filtered by creation unless specified, but user asked for creation stats mostly. 
        # Typically "Total Agents" means current total. Keeping it total for now as filtering agents by creation date is less common usage in dashboard summary unless strictly "New Agents")
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
        
        # 5. Alerts & Health (Should likely be relevant to current status OR filtered time. 
        # Let's filter alerts by time too if they represent events like failure)
        
        # Payment Failures
        fail_stmt = select(func.count(Payment.id)).where(Payment.status == PaymentStatus.FAILED)
        fail_stmt = apply_date_filter(fail_stmt, Payment.created_at)
        result = await db.execute(fail_stmt)
        payment_failures = result.scalar() or 0
        
        # Cancelled Bookings
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
            func.sum(Booking.total_amount).label('total_revenue')
        ).join(Agent, Agent.user_id == User.id).outerjoin(Booking, (User.id == Booking.agent_id) & (
            (Booking.created_at >= filter_start) if filter_start else True
        ) & (
            (Booking.created_at < filter_end) if filter_end else True
        )).where(
            User.role == UserRole.AGENT
        ).group_by(User.id, Agent.first_name, Agent.last_name)
        
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
        
        # Nearing Expiry (Active + Ends within 7 days)
        expiry_threshold = datetime.utcnow().date() + timedelta(days=7)
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

        return {
            "totalPackages": total_packages,
            "totalBookings": total_bookings,
            "totalRevenue": float(total_revenue) if total_revenue else 0,
            "activeSubscriptions": active_subscriptions, # NEW
            "subscriptionsNearingExpiry": subscriptions_nearing_expiry, # NEW
            "expiryDetails": expiry_details, # NEW
            "agents": {
                "total": total_agents,
                "active": active_agents,
                "inactive": inactive_agents
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
                "recent": recent_packages
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
