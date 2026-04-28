import time
import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

# 엔드포인트별 분당 최대 요청 수
RATE_LIMITS: dict[str, int] = {
    "/api/upload": 10,
    "/api/ocr": 20,
    "/api/chat": 30,
    "default": 60,
}


def _get_limit(path: str) -> int:
    for prefix, limit in RATE_LIMITS.items():
        if path.startswith(prefix):
            return limit
    return RATE_LIMITS["default"]


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._redis: aioredis.Redis | None = None

    def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._redis

    async def dispatch(self, request: Request, call_next):
        # health, metrics는 제외
        if request.url.path in ("/health", "/metrics"):
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        path = request.url.path
        limit = _get_limit(path)
        key = f"rate:{ip}:{path}"

        try:
            r = self._get_redis()
            count = await r.incr(key)
            if count == 1:
                await r.expire(key, 60)
            if count > limit:
                return JSONResponse(
                    status_code=429,
                    content={"code": "RATE_LIMIT_EXCEEDED", "message": f"요청이 너무 많아요. 잠시 후 다시 시도해주세요. (분당 {limit}회 제한)"},
                )
        except Exception as e:
            logger.warning(f"Rate limit Redis 오류 (무시): {e}")

        return await call_next(request)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in ("/health", "/metrics"):
            return await call_next(request)

        start = time.time()
        response = await call_next(request)
        duration = round((time.time() - start) * 1000)

        logger.info(
            f"{request.method} {request.url.path} "
            f"→ {response.status_code} ({duration}ms)"
        )
        return response
