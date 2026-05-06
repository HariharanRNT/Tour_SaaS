import asyncio
import os
import sys
from uuid import UUID

# Add backend to path
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.database import get_db, AsyncSessionLocal
from app.models import User, Package, PackageStatus, UserRole
from sqlalchemy.orm import selectinload
from sqlalchemy import func

async def debug_list_packages():
    async with AsyncSessionLocal() as db:
        # Find an agent user
        stmt = select(User).where(User.role == UserRole.AGENT).limit(1)
        result = await db.execute(stmt)
        agent = result.scalar_one_or_none()
        
        if not agent:
            print("No agent found")
            return

        print(f"Debugging for agent: {agent.email} (ID: {agent.id}, AgentID: {agent.agent_id})")
        
        status_filter = "published"
        limit = 100
        page = 1
        skip = (page - 1) * limit
        
        # Base query - using the logic from agent_packages.py
        # Use agent_id if it exists, otherwise use id? 
        # The current code uses agent_id. Let's see what it evaluates to.
        agent_id_to_use = agent.agent_id
        print(f"Using agent_id_to_use: {agent_id_to_use}")
        
        stmt = select(Package).where(Package.created_by == agent_id_to_use)
        
        if status_filter and status_filter != 'all':
            stmt = stmt.where(Package.status == PackageStatus(status_filter.upper()))
            
        # Total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0
        print(f"Total count: {total}")
        
        # Apply pagination and eager loading
        stmt = stmt.options(
            selectinload(Package.images),
            selectinload(Package.itinerary_items),
            selectinload(Package.availability),
            selectinload(Package.trip_styles),
            selectinload(Package.activity_tags)
        ).order_by(Package.created_at.desc()).offset(skip).limit(limit)
        
        print("Executing main stmt...")
        result = await db.execute(stmt)
        packages = result.scalars().all()
        print(f"Fetched {len(packages)} packages")
        
        # Try to serialize
        from app.schemas.packages import PaginatedPackageResponse
        try:
            print("Attempting to serialize to PaginatedPackageResponse...")
            resp = PaginatedPackageResponse(
                items=packages,
                total=total,
                page=page,
                limit=limit
            )
            print("Serialization successful")
        except Exception as e:
            print(f"Serialization failed: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_list_packages())
