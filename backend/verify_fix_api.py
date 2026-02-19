
import asyncio
import httpx

SESSION_ID = "ab10546b-3905-4aef-926d-0530e2faaad8" 
DOMAIN = "rnt.local"
URL = f"http://localhost:8000/api/v1/trip-planner/session/{SESSION_ID}"

async def verify_api():
    async with httpx.AsyncClient() as client:
        print(f"Fetching session {SESSION_ID} with domain {DOMAIN}...")
        # Simulate domain via Host header or if the API uses a custom header for domain extraction
        # app.api.deps.get_current_domain looks for X-Domain header
        headers = {"X-Domain": DOMAIN} 
        
        try:
            response = await client.get(URL, headers=headers)
            if response.status_code == 200:
                data = response.json()
                print("Full Response:", data)
                gst_pct = data.get("gst_percentage")
                gst_inc = data.get("gst_inclusive")
                print("\n✅ API Response received:")
                print(f"   - GST Percentage: {gst_pct}%")
                print(f"   - GST Inclusive: {gst_inc}")
                
                if gst_pct == 17:
                    print("\n🎉 SUCCESS: API is returning 17% (Domain Agent's GST). Fix confirmed!")
                elif gst_pct == 18:
                    print("\n❌ FAILURE: API is still returning 18% (Package Creator's GST).")
                else:
                    print(f"\n❓ UNEXPECTED: API returned {gst_pct}%. Check database.")
            else:
                print(f"❌ API Error: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify_api())
