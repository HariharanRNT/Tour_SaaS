import redis.asyncio as redis
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class RedisClient:
    _instance = None
    _client = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            logger.info(f"Initializing Redis client: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
            cls._client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                decode_responses=True
            )
        return cls._client

    @classmethod
    async def close(cls):
        if cls._client:
            await cls._client.close()
            cls._client = None
            logger.info("Redis client closed")

# Convenience function for DI or direct usage
def get_redis():
    return RedisClient.get_client()
