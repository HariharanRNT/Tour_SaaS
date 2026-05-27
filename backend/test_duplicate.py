import asyncio
import json
import httpx

async def main():
    url = 'http://abc.local:8000/api/v1/enquiries'
    headers = {'X-Domain': 'abc.local', 'Content-Type': 'application/json'}
    data = {
        'customer_name': 'Test Duplicate',
        'email': 'duplicate@example.com',
        'phone': '1234567890',
        'travel_date': '2026-10-10',
        'travellers': 2,
        'message': 'Testing duplicate'
    }
    
    async with httpx.AsyncClient() as client:
        print('Sending first enquiry...')
        r1 = await client.post(url, headers=headers, json=data)
        print('Response 1:', r1.status_code)
        
        await asyncio.sleep(2)
        
        print('Sending second enquiry...')
        r2 = await client.post(url, headers=headers, json=data)
        print('Response 2:', r2.status_code, r2.text)

asyncio.run(main())
