from app.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models import Package, User
from app.services.pdf_service import pdf_service
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import asyncio
import logging
from fastapi_cache import FastAPICache

logger = logging.getLogger(__name__)

async def _generate_package_pdf_async(package_id: str):
    """Internal async logic for generating and caching PDF"""
    async with AsyncSessionLocal() as db:
        query = select(Package).where(Package.id == package_id).options(
            selectinload(Package.itinerary_items),
            selectinload(Package.creator).selectinload(User.agent_profile)
        )
        result = await db.execute(query)
        package = result.scalar_one_or_none()
        
        if not package:
            logger.error(f"Task: Package {package_id} not found for PDF generation")
            return
            
        agent_profile = {}
        if package.creator and package.creator.agent_profile:
            p = package.creator.agent_profile
            agent_profile = {
                'agency_name': p.agency_name,
                'email': package.creator.email,
                'phone': p.phone if hasattr(p, 'phone') else "",
                'logo_url': p.logo_url if hasattr(p, 'logo_url') else None
            }

        s = {}
        pdf_bytes = pdf_service.generate_package_itinerary_pdf_bytes(
            package=package,
            agent_profile=agent_profile,
            s=s
        )
        
        if pdf_bytes:
            # Store in Redis via FastAPICache if available, or direct redis
            # We'll use a specific key format: pdf_cache:{package_id}
            try:
                # We need to ensure FastAPICache backend is initialized in the worker
                # If not, we might need to initialize it here or use a direct redis client
                backend = FastAPICache.get_backend()
                if backend:
                    key = f"pdf:package:{package_id}"
                    # Store with 24h expiration
                    await backend.set(key, pdf_bytes, expire=86400)
                    logger.info(f"Task: Cached PDF for package {package_id}")
            except Exception as e:
                logger.error(f"Task: Failed to cache PDF in Redis: {e}")

@celery_app.task(name="app.tasks.pdf_tasks.generate_package_pdf_task")
def generate_package_pdf_task(package_id: str):
    """Celery task to generate and cache package itinerary PDF"""
    asyncio.run(_generate_package_pdf_async(package_id))

