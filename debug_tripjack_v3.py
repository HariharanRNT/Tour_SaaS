
import os
import sys
import asyncio
import logging
from dotenv import load_dotenv

# Add backend directory to sys.path to allow imports
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Load environment variables
dotenv_path = os.path.join(os.getcwd(), 'backend', '.env')
load_dotenv(dotenv_path)

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

from app.services.tripjack_adapter import TripJackAdapter

async def test_search():
    api_key = os.getenv('TRIPJACK_API_KEY')
    base_url = os.getenv('TRIPJACK_BASE_URL')
    
    if not api_key or not base_url:
        print("Error: TRIPJACK_API_KEY or TRIPJACK_BASE_URL not found in environment variables.")
        print(f"Loaded .env from: {dotenv_path}")
        return

    try:
        adapter = TripJackAdapter(api_key=api_key, base_url=base_url)
        
        print("Searching for flights (DEL -> MAA)...")
        flights = await adapter.search_flights(
            origin="DEL",
            destination="MAA",
            departure_date="2026-02-15",
            adults=1
        )
        
        print(f"Successfully found {len(flights)} flights")
        if flights:
            print("First flight sample:")
            print(flights[0])
            print("Route Types found:", set(f.get('route_type') for f in flights))
            # Access raw response data if possible or check normalized fields
            if hasattr(adapter, '_normalize_single_flight'):
                # We can't easily see raw data unless we modify adapter to return it or print it.
                # But 'flights[0]' contains 'raw_data' key as per my previous edit to adapter!
                 if 'raw_data' in flights[0]:
                     import json
                     raw = flights[0]['raw_data']
                     print("\n--- Raw Price Data ---")
                     if 'totalPriceList' in raw:
                         print(json.dumps(raw['totalPriceList'], indent=2))
                     else:
                         print("No totalPriceList in raw data")
                     print("----------------------\n")
            
    except Exception as e:
        print(f"Error during search: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_search())
