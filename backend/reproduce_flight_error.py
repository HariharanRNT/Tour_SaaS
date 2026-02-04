
import asyncio
import os
from app.services.tripjack_adapter import TripJackAdapter

# Mock settings just for this script if needed, or rely on env vars if set.
# Assuming env vars are set or we can hardcode for testing.
API_KEY = os.getenv("TRIPJACK_API_KEY", "112695581251e3-c2a8-43f6-9cc5-dea277840f35")
BASE_URL = os.getenv("TRIPJACK_BASE_URL", "https://apitest.tripjack.com")
# Note: The user didn't provide the actual key in logs, so I'm hoping it's in the environment.
# If not, I can try to find where it's defined or just import settings.

from app.config import settings

async def main():
    adapter = TripJackAdapter(
        # api_key=settings.TRIPJACK_API_KEY, # Use the hardcoded valid one for now to test isolated
        api_key=API_KEY,
        base_url=BASE_URL
    )

    print("Attempting flight search...")
    try:
        results = await adapter.search_flights(
            origin="BOM",
            destination="MAA",
            departure_date="2026-02-27",
            return_date="2026-03-02",
            adults=1,
            is_direct_flight=True,
            is_connecting_flight=True # This is the default in the adapter
        )
        print(f"Search successful. Found {len(results)} flights.")
    except Exception as e:
        print(f"Caught exception: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Ensure we can import app
    import sys
    sys.path.append(os.getcwd())
    
    # We need to run inside a proper context if there are deps, but adapter is mostly standalone http
    asyncio.run(main())
