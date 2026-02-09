import asyncio
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.otp_service import OTPService
from app.core.redis import get_redis

async def verify_redis_otp():
    test_email = "test@example.com"
    
    print(f"--- Testing OTP Flow for {test_email} ---")
    
    # 1. Check Rate Limit
    print("Checking rate limit...")
    for i in range(4):
        can_resend = await OTPService.check_rate_limit(test_email)
        print(f"Attempt {i+1}: Can resend? {can_resend}")
    
    # 2. Generate and Store OTP
    otp = OTPService.generate_otp()
    print(f"Generated OTP: {otp}")
    
    success = await OTPService.store_otp(test_email, otp)
    print(f"Stored OTP in Redis: {success}")
    
    # 3. Check TTL
    redis = get_redis()
    ttl = await redis.ttl(f"forgot_pwd_otp:{test_email}")
    print(f"OTP TTL in Redis: {ttl}s")
    
    # 4. Verify Correct OTP
    is_valid = await OTPService.verify_otp(test_email, otp)
    print(f"Verifying with correct OTP: {is_valid}")
    
    # 5. Verify Incorrect OTP
    is_invalid = await OTPService.verify_otp(test_email, "000000")
    print(f"Verifying with incorrect OTP: {is_invalid}")
    
    # 6. Delete OTP
    await OTPService.delete_otp(test_email)
    exists = await redis.exists(f"forgot_pwd_otp:{test_email}")
    print(f"OTP exists after deletion? {bool(exists)}")
    
    # Cleanup resend limit for next test run
    await redis.delete(f"otp_resend_limit:{test_email}")
    
    print("--- Verification Complete ---")

if __name__ == "__main__":
    asyncio.run(verify_redis_otp())
