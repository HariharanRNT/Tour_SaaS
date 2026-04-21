import asyncio
import os
import sys

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.gemini_service import gemini_service
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import Package, BookingType, PackageStatus

async def test_ai_features():
    # 1. Check for an ENQUIRY package or create one
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Package).where(Package.booking_type == BookingType.ENQUIRY).limit(1))
        enquiry_pkg = result.scalar_one_or_none()
        
        if not enquiry_pkg:
            print("No ENQUIRY package found, trying to find any published package...")
            result = await db.execute(select(Package).where(Package.status == PackageStatus.PUBLISHED).limit(1))
            pkg = result.scalar_one_or_none()
            if pkg:
                print(f"Found package: {pkg.title}. Temporarily setting to ENQUIRY for test.")
                # We won't commit this to keep DB clean, just used for search sim if we could
            else:
                print("No published packages found.")

    # 2. Test Package Search with Gemini
    print("\n--- Testing Package Search ---")
    response = await gemini_service.chat_package_search(
        message="Find me some packages for Kerala",
        conversation_history=[]
    )
    print(f"AI Message: {response.get('message')}")
    if response.get('tool_used'):
        print(f"Tool Used: {response.get('tool_used')}")
        print(f"Tool Result Count: {len(response.get('tool_result', []))}")
        for p in response.get('tool_result', []):
            print(f" - {p['title']} (Type: {p.get('booking_type')}, Price: {p['price']})")

    # 3. Test Cancellation Policy with Context
    print("\n--- Testing Cancellation Policy Query ---")
    # Simulate a conversation where a package details were just fetched
    history = [
        {"role": "user", "content": "I like the Kerala package. Tell me more."},
        {"role": "assistant", "content": "Great choice!", "tool_used": "get_package_details", "tool_result": {
            "id": "some-id",
            "title": "Kerala Backwaters",
            "cancellation_enabled": True,
            "cancellation_rules": [{"daysBefore": 30, "refundPercentage": 100}, {"daysBefore": 15, "refundPercentage": 50}]
        }}
    ]
    
    response = await gemini_service.chat_package_search(
        message="What is the cancellation policy?",
        conversation_history=history
    )
    print(f"AI Message: {response.get('message')}")

    # 4. Test Fallback for Cancellation
    print("\n--- Testing Cancellation Fallback ---")
    history_no_policy = [
        {"role": "user", "content": "Tell me about the Goa trip."},
        {"role": "assistant", "content": "Sure!", "tool_used": "get_package_details", "tool_result": {
            "id": "goa-id",
            "title": "Goa Beaches",
            "cancellation_enabled": False,
            "cancellation_rules": []
        }}
    ]
    response = await gemini_service.chat_package_search(
        message="Can I cancel this?",
        conversation_history=history_no_policy
    )
    print(f"AI Message: {response.get('message')}")

if __name__ == "__main__":
    asyncio.run(test_ai_features())
