import asyncio
import os
import sys

# Set up paths
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal
from app.models import Enquiry, Package, Agent
from app.services.pdf_service import pdf_service
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def main():
    async with AsyncSessionLocal() as session:
        # Get an enquiry
        enquiry_res = await session.execute(
            select(Enquiry)
            .options(selectinload(Enquiry.package))
            .limit(1)
        )
        enquiry = enquiry_res.scalar_one_or_none()
        if not enquiry:
            print("No enquiries found in database. Cannot run test.")
            return

        # Get the agent profile
        agent_res = await session.execute(
            select(Agent).limit(1)
        )
        agent = agent_res.scalar_one_or_none()
        if not agent:
            print("Agent not found.")
            return

        # Get packages
        packages_res = await session.execute(
            select(Package)
            .options(selectinload(Package.itinerary_items))
            .limit(2)
        )
        packages = packages_res.scalars().all()
        if not packages:
            print("No packages found.")
            return

        # Make mock quoted data
        quoted_data = [
            {
                'packageId': str(pkg.id),
                'quotedPrice': float(pkg.price_per_person)
            }
            for pkg in packages
        ]

        print(f"Generating PDF for Enquiry ID: {enquiry.id}")
        print(f"Agent Agency Name: {agent.agency_name}")
        print(f"Packages: {[p.title for p in packages]}")

        pdf_path = await pdf_service.generate_quote_pdf(
            enquiry=enquiry,
            packages=packages,
            agent_profile=agent,
            quoted_data=quoted_data
        )
        print(f"SUCCESS! PDF Generated successfully at: {pdf_path}")

if __name__ == "__main__":
    asyncio.run(main())
