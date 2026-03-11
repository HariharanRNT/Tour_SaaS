import asyncio
import httpx

async def main():
    async with httpx.AsyncClient(base_url='http://localhost:8000/api/v1') as c:
        email = 'new_customer99@example.com'
        pwd = 'SecurePassword123!'
        
        print("1. Registering new customer...")
        reg_res = await c.post('/auth/register', json={
            "email": email,
            "password": pwd,
            "first_name": "Test",
            "last_name": "Customer",
            "phone": "1234567890"
        })
        print(f"Registration Status: {reg_res.status_code}")
        
        print("\n2. Attempting Login...")
        login_res = await c.post('/auth/login', data={
            "username": email,
            "password": pwd
        })
        print(f"Login Status: {login_res.status_code}")
        
        json_resp = login_res.json()
        print(json_resp)
        if json_resp.get("require_otp"):
            print("\nSUCCESS! OTP is required for customer login.")
        else:
            print("\nFAIL! OTP was NOT required.")

if __name__ == '__main__':
    asyncio.run(main())
