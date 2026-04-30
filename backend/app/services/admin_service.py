from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from jose import jwt, JWTError

from app.core.config import settings


class AdminService:
    """관리자 인증 서비스"""

    @staticmethod
    def authenticate(password: str) -> str:
        """비밀번호 검증 후 관리자 JWT 반환"""
        if not settings.ADMIN_PASSWORD or password != settings.ADMIN_PASSWORD:
            raise HTTPException(status_code=401, detail="비밀번호가 틀렸어요.")
        return jwt.encode(
            {
                "sub": "admin",
                "role": "admin",
                "exp": datetime.now(timezone.utc) + timedelta(hours=12),
            },
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

    @staticmethod
    def verify_token(token: str) -> str:
        """관리자 JWT 검증 후 sub 반환"""
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
            if payload.get("role") != "admin":
                raise HTTPException(status_code=403, detail="관리자 권한이 없습니다.")
            return payload["sub"]
        except JWTError:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
