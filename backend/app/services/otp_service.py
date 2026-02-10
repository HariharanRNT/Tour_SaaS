import random
import string
import logging
from typing import Optional
from app.core.redis import get_redis

logger = logging.getLogger(__name__)

class OTPService:
    # Password reset OTP keys
    OTP_KEY_PREFIX = "forgot_pwd_otp:"
    RESEND_LIMIT_PREFIX = "otp_resend_limit:"
    
    # Agent login OTP keys
    LOGIN_OTP_KEY_PREFIX = "agent_login_otp:"
    LOGIN_RESEND_LIMIT_PREFIX = "agent_login_resend:"
    
    OTP_EXPIRY = 300  # 5 minutes
    MAX_RESEND_ATTEMPTS = 10  # Maximum OTP requests per hour
    RESEND_WINDOW = 3600  # 1 hour window for resend limit

    @classmethod
    def _get_otp_key(cls, email: str) -> str:
        return f"{cls.OTP_KEY_PREFIX}{email}"

    @classmethod
    def _get_resend_limit_key(cls, email: str) -> str:
        return f"{cls.RESEND_LIMIT_PREFIX}{email}"
    
    @classmethod
    def _get_login_otp_key(cls, email: str) -> str:
        """Get Redis key for agent login OTP"""
        return f"{cls.LOGIN_OTP_KEY_PREFIX}{email}"
    
    @classmethod
    def _get_login_resend_limit_key(cls, email: str) -> str:
        """Get Redis key for agent login OTP resend limit"""
        return f"{cls.LOGIN_RESEND_LIMIT_PREFIX}{email}"

    @classmethod
    def generate_otp(cls) -> str:
        """Generate a 6-digit numeric OTP"""
        return ''.join(random.choices(string.digits, k=6))

    @classmethod
    async def store_otp(cls, email: str, otp: str) -> bool:
        """Store OTP in Redis with TTL (for password reset)"""
        redis = get_redis()
        key = cls._get_otp_key(email)
        try:
            # Store OTP and set expiry
            await redis.setex(key, cls.OTP_EXPIRY, otp)
            logger.info(f"Stored password reset OTP for {email} in Redis with {cls.OTP_EXPIRY}s TTL")
            return True
        except Exception as e:
            logger.error(f"Failed to store OTP in Redis: {str(e)}")
            return False

    @classmethod
    async def verify_otp(cls, email: str, otp: str) -> bool:
        """Verify OTP from Redis (for password reset)"""
        redis = get_redis()
        key = cls._get_otp_key(email)
        try:
            stored_otp = await redis.get(key)
            if not stored_otp:
                logger.info(f"No password reset OTP found for {email} or it has expired")
                return False
            
            # Masking OTP in logs for security
            is_valid = stored_otp == otp
            logger.info(f"Password reset OTP verification for {email}: {'Success' if is_valid else 'Failed'}")
            return is_valid
        except Exception as e:
            logger.error(f"Failed to verify OTP from Redis: {str(e)}")
            return False

    @classmethod
    async def delete_otp(cls, email: str) -> bool:
        """Clear OTP from Redis after success (for password reset)"""
        redis = get_redis()
        key = cls._get_otp_key(email)
        try:
            await redis.delete(key)
            logger.info(f"Cleared password reset OTP for {email} from Redis")
            return True
        except Exception as e:
            logger.error(f"Failed to delete OTP from Redis: {str(e)}")
            return False

    @classmethod
    async def check_rate_limit(cls, email: str) -> bool:
        """Check if user has exceeded resend limits (for password reset)"""
        redis = get_redis()
        key = cls._get_resend_limit_key(email)
        try:
            attempts = await redis.get(key)
            current_attempts = int(attempts) if attempts else 0
            
            if current_attempts >= cls.MAX_RESEND_ATTEMPTS:
                logger.warning(
                    f"🚫 RATE LIMIT BLOCKED - Password Reset OTP: {email} "
                    f"({current_attempts}/{cls.MAX_RESEND_ATTEMPTS} attempts in last hour)"
                )
                return False
            
            # Increment attempts and set window if not exists
            if not attempts:
                await redis.setex(key, cls.RESEND_WINDOW, 1)
                logger.info(f"✅ Password reset OTP request allowed for {email} (1/{cls.MAX_RESEND_ATTEMPTS})")
            else:
                await redis.incr(key)
                logger.info(f"✅ Password reset OTP request allowed for {email} ({current_attempts + 1}/{cls.MAX_RESEND_ATTEMPTS})")
            
            return True
        except Exception as e:
            logger.error(f"Failed to check rate limit in Redis: {str(e)}")
            return True  # Fail open in case of Redis error to not block users
    
    # ===== Agent Login OTP Methods =====
    
    @classmethod
    async def store_login_otp(cls, email: str, otp: str) -> bool:
        """Store login OTP in Redis with TTL"""
        redis = get_redis()
        key = cls._get_login_otp_key(email)
        try:
            await redis.setex(key, cls.OTP_EXPIRY, otp)
            logger.info(f"Stored login OTP for {email} in Redis with {cls.OTP_EXPIRY}s TTL")
            return True
        except Exception as e:
            logger.error(f"Failed to store login OTP in Redis: {str(e)}")
            return False
    
    @classmethod
    async def verify_login_otp(cls, email: str, otp: str) -> bool:
        """Verify login OTP from Redis"""
        redis = get_redis()
        key = cls._get_login_otp_key(email)
        try:
            stored_otp = await redis.get(key)
            if not stored_otp:
                logger.info(f"No login OTP found for {email} or it has expired")
                return False
            
            is_valid = stored_otp == otp
            logger.info(f"Login OTP verification for {email}: {'Success' if is_valid else 'Failed'}")
            return is_valid
        except Exception as e:
            logger.error(f"Failed to verify login OTP from Redis: {str(e)}")
            return False
    
    @classmethod
    async def delete_login_otp(cls, email: str) -> bool:
        """Clear login OTP from Redis after successful verification"""
        redis = get_redis()
        key = cls._get_login_otp_key(email)
        try:
            await redis.delete(key)
            logger.info(f"Cleared login OTP for {email} from Redis")
            return True
        except Exception as e:
            logger.error(f"Failed to delete login OTP from Redis: {str(e)}")
            return False
    
    @classmethod
    async def check_login_rate_limit(cls, email: str) -> bool:
        """Check if user has exceeded login OTP request limits"""
        redis = get_redis()
        key = cls._get_login_resend_limit_key(email)
        try:
            attempts = await redis.get(key)
            current_attempts = int(attempts) if attempts else 0
            
            if current_attempts >= cls.MAX_RESEND_ATTEMPTS:
                logger.warning(
                    f"🚫 RATE LIMIT BLOCKED - Agent Login OTP: {email} "
                    f"({current_attempts}/{cls.MAX_RESEND_ATTEMPTS} attempts in last hour)"
                )
                return False
            
            # Increment attempts and set window if not exists
            if not attempts:
                await redis.setex(key, cls.RESEND_WINDOW, 1)
                logger.info(f"✅ Agent login OTP request allowed for {email} (1/{cls.MAX_RESEND_ATTEMPTS})")
            else:
                await redis.incr(key)
                logger.info(f"✅ Agent login OTP request allowed for {email} ({current_attempts + 1}/{cls.MAX_RESEND_ATTEMPTS})")
            
            return True
        except Exception as e:
            logger.error(f"Failed to check login rate limit in Redis: {str(e)}")
            return True  # Fail open in case of Redis error to not block users
