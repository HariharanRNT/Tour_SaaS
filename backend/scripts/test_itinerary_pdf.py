import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import Package
from sqlalchemy.orm import selectinload
from app.services.itinerary_pdf_service import ItineraryPdfService

async def test_pdf():
    async with AsyncSessionLocal() as db:
        # Target the multi-city package found in diagnostics
        query = select(Package).where(Package.package_mode == 'multi').options(selectinload(Package.itinerary_items)).limit(1)
        result = await db.execute(query)
        package = result.scalar_one_or_none()
        
        if not package:
            print("No packages found in DB to test.")
            return
            
        pdf_bytes = ItineraryPdfService.generate_itinerary_pdf(package)
        if pdf_bytes:
            print(f"Successfully generated Itinerary PDF! Size: {len(pdf_bytes)} bytes")
            # Save it to check manually if needed:
            pdf_path = f"Itinerary_Test_{package.id}.pdf"
            with open(pdf_path, 'wb') as f:
                f.write(pdf_bytes)
            print(f"Saved to {pdf_path}")
        else:
            print("PDF generation failed.")

if __name__ == "__main__":
    asyncio.run(test_pdf())
