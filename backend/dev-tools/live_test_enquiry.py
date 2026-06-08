import asyncio
import httpx

async def main():
    url = 'http://localhost:8000/api/v1/enquiries'
    headers = {'X-Domain': 'abc.local', 'Content-Type': 'application/json'}
    data = {
        'customer_name': 'Live Test User',
        'email': 'livetest@example.com',
        'phone': '9876543210',
        'travel_date': '2026-12-01',
        'travellers': 2,
        'message': 'Test email from live test script'
    }
    
    print('Sending enquiry...')
    async with httpx.AsyncClient() as client:
        r = await client.post(url, headers=headers, json=data, timeout=30)
        print(f'Status: {r.status_code}')
        print(f'Response: {r.text}')

asyncio.run(main())
