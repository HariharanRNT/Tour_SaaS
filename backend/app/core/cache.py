import hashlib
import json
import logging
from typing import Optional, Callable, Any
from functools import wraps

from fastapi import Request, Response
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
from redis.exceptions import RedisError, ConnectionError

logger = logging.getLogger(__name__)

def tenant_key_builder(
    func: Callable,
    namespace: str = "",
    request: Optional[Request] = None,
    response: Optional[Response] = None,
    *args,
    **kwargs,
) -> str:
    """
    Custom cache key builder that incorporates tenant isolation (domain) 
    and current user ID to prevent cache collisions.
    """
    # 1. Try to get domain from kwargs (injected by Depends)
    domain = kwargs.get("domain")
    
    # 2. Try to get domain from request headers/state
    if not domain and request:
        domain = getattr(request.state, "domain", request.headers.get("x-domain", request.headers.get("domain")))
        
    if not domain:
        domain = "default"
        
    user_id = "guest"
    if "current_user" in kwargs and kwargs["current_user"] is not None:
        user = kwargs["current_user"]
        user_id = getattr(user, "id", "guest")
    elif "current_agent" in kwargs and kwargs["current_agent"] is not None:
        agent = kwargs["current_agent"]
        user_id = getattr(agent, "id", "guest")

    safe_kwargs = {}
    for k, v in kwargs.items():
        if k not in ("request", "response", "db", "current_user", "current_agent"):
            if isinstance(v, (str, int, float, bool, tuple)):
                safe_kwargs[k] = v
            elif isinstance(v, list):
                safe_kwargs[k] = tuple(v)

    kwargs_str = json.dumps(safe_kwargs, sort_keys=True)
    
    # Build unique remainder
    remainder_str = f"{func.__module__}:{func.__name__}:{domain}:{user_id}:{kwargs_str}"
    hashed_remainder = hashlib.md5(remainder_str.encode("utf-8")).hexdigest()
    
    # Return key formatted as: namespace:hashed_remainder (prefix is added automatically by FastAPI_Cache)
    return f"{namespace}:{hashed_remainder}"

def safe_cache(expire: int = None, namespace: str = "", **cache_kwargs):
    """
    A robust wrapper around fastapi_cache's @cache decorator.
    If Redis throws a connection error, it gracefully falls back to executing
    the function without crashing the application.
    """
    def wrapper(func):
        cached_func = cache(expire=expire, namespace=namespace, key_builder=tenant_key_builder, **cache_kwargs)(func)
        
        @wraps(func)
        async def inner(*args, **kwargs):
            try:
                FastAPICache.get_backend()
            except Exception:
                return await func(*args, **kwargs)

            try:
                return await cached_func(*args, **kwargs)
            except (RedisError, ConnectionError, OSError) as e:
                logger.warning(f"Cache error in {func.__name__}, falling back to DB: {str(e)}")
                return await func(*args, **kwargs)
                
        return inner
    return wrapper

async def invalidate_namespace(namespace: str) -> None:
    """
    Invalidates all cache keys belonging to a specific namespace by scanning.
    """
    try:
        backend = FastAPICache.get_backend()
        if hasattr(backend, "redis") and backend.redis:
            redis = backend.redis
            prefix = FastAPICache.get_prefix()
            match_pattern = f"{prefix}:{namespace}:*"
            
            # Scan and delete keys iteratively
            cursor = b"0"
            while cursor:
                cursor, keys = await redis.scan(cursor=cursor, match=match_pattern, count=100)
                if keys:
                    await redis.delete(*keys)
            logger.info(f"Successfully invalidated cache namespace: {namespace}")
    except Exception as e:
        logger.error(f"Failed to invalidate cache namespace '{namespace}': {e}")
