import asyncio
import logging
from app.main import app
from app.api.deps import get_db
from fastapi.testclient import TestClient

# Setup logging
logging.basicConfig(level=logging.INFO)

client = TestClient(app)

def test_dashboard_stats():
    print("Fetching dashboard stats...")
    try:
        response = client.get("/api/v1/admin-simple/dashboard-stats")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Stats Response Keys:", data.keys())
            print(f"Active Subscriptions: {data.get('activeSubscriptions')}")
            print(f"Nearing Expiry: {data.get('subscriptionsNearingExpiry')}")
            
            assert 'activeSubscriptions' in data
            assert 'subscriptionsNearingExpiry' in data
            assert 'expiryDetails' in data
            print(f"Expiry Details: {data.get('expiryDetails')}")
            print("Verification Successful: New keys present.")
        else:
            print(f"Error Response: {response.text}")
            
    except Exception as e:
        print(f"Test Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_dashboard_stats()
