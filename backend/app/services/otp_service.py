import random
import string
import logging
from typing import Optional
from app.core.redis import get_redis

logger = logging.getLogger(__name__)

class OTPService:
    OTP_KEY_PREFIX = "forgot_pwd_otp:"
    RESEND_LIMIT_PREFIX = "otp_resend_limit:"
    OTP_EXPIRY = 300  # 5 minutes
    MAX_RESEND_ATTEMPTS = 3
    RESEND_WINDOW = 3600  # 1 hour window for resend limit

    @classmethod
    def _get_otp_key(cls, email: str) -> str:
        return f"{cls.OTP_KEY_PREFIX}{email}"

    @classmethod
    def _get_resend_limit_key(cls, email: str) -> str:
        return f"{cls.RESEND_LIMIT_PREFIX}{email}"

    @classmethod
    def generate_otp(cls) -> str:
        """Generate a 6-digit numeric OTP"""
        return ''.join(random.choices(string.digits, k=6))

    @classmethod
    async def store_otp(cls, email: str, otp: str) -> bool:
        """Store OTP in Redis with TTL"""
        redis = get_redis()
        key = cls._get_otp_key(email)
        try:
            # Store OTP and set expiry
            await redis.setex(key, cls.OTP_EXPIRY, otp)
            logger.info(f"Stored OTP for {email} in Redis with {cls.OTP_EXPIRY}s TTL")
            return True
        except Exception as e:
            logger.error(f"Failed to store OTP in Redis: {str(e)}")
            return False

    @classmethod
    async def verify_otp(cls, email: str, otp: str) -> bool:
        """Verify OTP from Redis"""
        redis = get_redis()
        key = cls._get_otp_key(email)
        try:
            stored_otp = await redis.get(key)
            if not stored_otp:
                logger.info(f"No OTP found for {email} or it has expired")
                return False
            
            # Masking OTP in logs for security
            is_valid = stored_otp == otp
            logger.info(f"OTP verification for {email}: {'Success' if is_valid else 'Failed'}")
            return is_valid
        except Exception as e:
            logger.error(f"Failed to verify OTP from Redis: {str(e)}")
            return False

    @classmethod
    async def delete_otp(cls, email: str) -> bool:
        """Clear OTP from Redis after success"""
        redis = get_redis()
        key = cls._get_otp_key(email)
        try:
            await redis.delete(key)
            logger.info(f"Cleared OTP for {email} from Redis")
            return True
        except Exception as e:
            logger.error(f"Failed to delete OTP from Redis: {str(e)}")
            return False

    @classmethod
    async def check_rate_limit(cls, email: str) -> bool:
        """Check if user has exceeded resend limits"""
        redis = get_redis()
        key = cls._get_resend_limit_key(email)
        try:
            attempts = await redis.get(key)
            if attempts and int(attempts) >= cls.MAX_RESEND_ATTEMPTS:
                logger.warning(f"Rate limit exceeded for OTP resend: {email}")
                return False
            
            # Increment attempts and set window if not exists
            if not attempts:
                await redis.setex(key, cls.RESEND_WINDOW, 1)
            else:
                await redis.incr(key)
            
            return True
        except Exception as e:
            logger.error(f"Failed to check rate limit in Redis: {str(e)}")
            return True  # Fail open in case of Redis error to not block users
