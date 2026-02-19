
import requests
import sys

SESSION_ID = "ab10546b-3905-4aef-926d-0530e2faaad8"
URL = f"http://localhost:8000/api/v1/trip-planner/session/{SESSION_ID}"

def check_session():
    try:
        # 1. Test with standard localhost
        print(f"Fetching session {SESSION_ID} from {URL}...")
        res = requests.get(URL)
        
        if res.status_code != 200:
            print(f"Failed to fetch session: {res.status_code}")
            print(res.text)
            return

        data = res.json()
        print("\nSession Data (Partial):")
        print(f"Destination: {data.get('destination')}")
        print(f"Price Per Person: {data.get('price_per_person')}")
        
        print("\nGST Settings:")
        gst_inc = data.get('gst_inclusive')
        gst_pct = data.get('gst_percentage')
        print(f"GST Inclusive: {gst_inc} (Type: {type(gst_inc)})")
        print(f"GST Percentage: {gst_pct} (Type: {type(gst_pct)})")
        
        if gst_inc is not None and gst_pct is not None:
             print("\n✅ SUCCESS: GST settings found in session response.")
        else:
             print("\n❌ AIL: GST settings missing or incomplete.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_session()
