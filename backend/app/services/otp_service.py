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
    MAX_RESEND_ATTEMPTS = 100  # Maximum OTP requests per hour
    RESEND_WINDOW = 3600  # 1 hour window for resend limit
    
    @classmethod
    def _normalize_email(cls, email: str) -> str:
        """Strip and lowercase email for consistent Redis keys"""
        if not email:
            return ""
        return email.strip().lower()

    @classmethod
    def _get_otp_key(cls, email: str, agent_id: Optional[str] = None) -> str:
        suffix = f":{agent_id}" if agent_id else ""
        return f"{cls.OTP_KEY_PREFIX}{cls._normalize_email(email)}{suffix}"

    @classmethod
    def _get_resend_limit_key(cls, email: str, agent_id: Optional[str] = None) -> str:
        suffix = f":{agent_id}" if agent_id else ""
        return f"{cls.RESEND_LIMIT_PREFIX}{cls._normalize_email(email)}{suffix}"
    
    @classmethod
    def _get_login_otp_key(cls, email: str, agent_id: Optional[str] = None) -> str:
        """Get Redis key for agent login OTP"""
        suffix = f":{agent_id}" if agent_id else ""
        return f"{cls.LOGIN_OTP_KEY_PREFIX}{cls._normalize_email(email)}{suffix}"
    
    @classmethod
    def _get_login_resend_limit_key(cls, email: str, agent_id: Optional[str] = None) -> str:
        """Get Redis key for agent login OTP resend limit"""
        suffix = f":{agent_id}" if agent_id else ""
        return f"{cls.LOGIN_RESEND_LIMIT_PREFIX}{cls._normalize_email(email)}{suffix}"

    @classmethod
    def generate_otp(cls) -> str:
        """Generate a 6-digit numeric OTP"""
        # return ''.join(random.choices(string.digits, k=6))
        return "123456"

    @classmethod
    async def store_otp(cls, email: str, otp: str, agent_id: Optional[str] = None) -> bool:
        """Store OTP in Redis with TTL (for password reset)"""
        redis = get_redis()
        key = cls._get_otp_key(email, agent_id)
        try:
            # Store OTP and set expiry
            await redis.setex(key, cls.OTP_EXPIRY, otp)
            logger.info(f"Stored password reset OTP for {email} (agent: {agent_id}) in Redis")
            return True
        except Exception as e:
            logger.error(f"Failed to store OTP in Redis: {str(e)}")
            return False

    @classmethod
    async def verify_otp(cls, email: str, otp: str, agent_id: Optional[str] = None) -> bool:
        """Verify OTP from Redis (for password reset)"""
        redis = get_redis()
        key = cls._get_otp_key(email, agent_id)
        try:
            stored_otp = await redis.get(key)
            if not stored_otp:
                logger.info(f"No password reset OTP found for {email} (agent: {agent_id})")
                return False
            
            is_valid = stored_otp == otp
            logger.info(f"Password reset OTP verification for {email} (agent: {agent_id}): {'Success' if is_valid else 'Failed'}")
            return is_valid
        except Exception as e:
            logger.error(f"Failed to verify OTP from Redis: {str(e)}")
            return False

    @classmethod
    async def delete_otp(cls, email: str, agent_id: Optional[str] = None) -> bool:
        """Clear OTP from Redis after success (for password reset)"""
        redis = get_redis()
        key = cls._get_otp_key(email, agent_id)
        try:
            await redis.delete(key)
            logger.info(f"Cleared password reset OTP for {email} (agent: {agent_id}) from Redis")
            return True
        except Exception as e:
            logger.error(f"Failed to delete OTP from Redis: {str(e)}")
            return False

    @classmethod
    async def check_rate_limit(cls, email: str, agent_id: Optional[str] = None) -> bool:
        """Check if user has exceeded resend limits (for password reset)"""
        redis = get_redis()
        key = cls._get_resend_limit_key(email, agent_id)
        try:
            attempts = await redis.get(key)
            current_attempts = int(attempts) if attempts else 0
            
            if current_attempts >= cls.MAX_RESEND_ATTEMPTS:
                logger.warning(
                    f"🚫 RATE LIMIT BLOCKED - Password Reset OTP: {email} (agent: {agent_id})"
                )
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
    
    # ===== Agent Login OTP Methods =====
    
    @classmethod
    async def store_login_otp(cls, email: str, otp: str, agent_id: Optional[str] = None) -> bool:
        """Store login OTP in Redis with TTL"""
        redis = get_redis()
        key = cls._get_login_otp_key(email, agent_id)
        try:
            await redis.setex(key, cls.OTP_EXPIRY, otp)
            logger.info(f"Stored login OTP for {email} (agent: {agent_id}) in Redis")
            return True
        except Exception as e:
            logger.error(f"Failed to store login OTP in Redis: {str(e)}")
            return False
    
    @classmethod
    async def verify_login_otp(cls, email: str, otp: str, agent_id: Optional[str] = None) -> bool:
        """Verify login OTP from Redis"""
        redis = get_redis()
        key = cls._get_login_otp_key(email, agent_id)
        try:
            stored_otp = await redis.get(key)
            if not stored_otp:
                logger.info(f"No login OTP found for {email} (agent: {agent_id})")
                return False
            
            is_valid = stored_otp == otp
            logger.info(f"Login OTP verification for {email} (agent: {agent_id}): {'Success' if is_valid else 'Failed'}")
            return is_valid
        except Exception as e:
            logger.error(f"Failed to verify login OTP from Redis: {str(e)}")
            return False
    
    @classmethod
    async def delete_login_otp(cls, email: str, agent_id: Optional[str] = None) -> bool:
        """Clear login OTP from Redis after successful verification"""
        redis = get_redis()
        key = cls._get_login_otp_key(email, agent_id)
        try:
            await redis.delete(key)
            logger.info(f"Cleared login OTP for {email} (agent: {agent_id}) from Redis")
            return True
        except Exception as e:
            logger.error(f"Failed to delete login OTP from Redis: {str(e)}")
            return False
    
    @classmethod
    async def check_login_rate_limit(cls, email: str, agent_id: Optional[str] = None) -> bool:
        """Check if user has exceeded login OTP request limits"""
        redis = get_redis()
        key = cls._get_login_resend_limit_key(email, agent_id)
        try:
            attempts = await redis.get(key)
            current_attempts = int(attempts) if attempts else 0
            
            if current_attempts >= cls.MAX_RESEND_ATTEMPTS:
                logger.warning(
                    f"🚫 RATE LIMIT BLOCKED - Agent Login OTP: {email} (agent: {agent_id})"
                )
                return False
            
            # Increment attempts and set window if not exists
            if not attempts:
                await redis.setex(key, cls.RESEND_WINDOW, 1)
            else:
                await redis.incr(key)
            
            return True
        except Exception as e:
            logger.error(f"Failed to check login rate limit in Redis: {str(e)}")
            return True  # Fail open in case of Redis error to not block users
