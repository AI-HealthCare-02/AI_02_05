import httpx
import logging
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)


def _encrypt_token(token: str) -> str:
    if not settings.TOKEN_ENCRYPT_KEY:
        return token
    from cryptography.fernet import Fernet
    return Fernet(settings.TOKEN_ENCRYPT_KEY.encode()).encrypt(token.encode()).decode()


def _decrypt_token(token: str) -> str:
    if not settings.TOKEN_ENCRYPT_KEY:
        return token
    from cryptography.fernet import Fernet
    try:
        return Fernet(settings.TOKEN_ENCRYPT_KEY.encode()).decrypt(token.encode()).decode()
    except Exception:
        return token


class AuthService:
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)

    async def kakao_login(self, code: str) -> dict:
        token_data = {
            "grant_type": "authorization_code",
            "client_id": settings.KAKAO_REST_API_KEY,
            "redirect_uri": settings.KAKAO_REDIRECT_URI,
            "code": code,
        }
        if settings.KAKAO_CLIENT_SECRET:
            token_data["client_secret"] = settings.KAKAO_CLIENT_SECRET

        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://kauth.kakao.com/oauth/token",
                data=token_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

        logger.info(f"카카오 토큰 status: {token_resp.status_code}")
        logger.info(f"카카오 토큰 body: {token_resp.text}")

        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"카카오 토큰 발급 실패: {token_resp.text}")

        token_json = token_resp.json()
        kakao_token = token_json["access_token"]
        kakao_refresh_token = token_json.get("refresh_token", "")

        async with httpx.AsyncClient() as client:
            user_resp = await client.get(
                "https://kapi.kakao.com/v2/user/me",
                headers={"Authorization": f"Bearer {kakao_token}"},
            )

        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="카카오 유저 정보 조회 실패")

        kakao_user = user_resp.json()
        logger.info(f"카카오 유저: {kakao_user}")

        kakao_id = str(kakao_user["id"])
        profile = kakao_user.get("kakao_account", {}).get("profile", {})
        nickname = profile.get("nickname", "사용자")
        profile_img_url = profile.get("profile_image_url", None)

        user = await self.user_repo.get_by_oauth("kakao", kakao_id)
        is_new = False
        if not user:
            user = await self.user_repo.create(
                oauth_provider="kakao",
                oauth_id=kakao_id,
                nickname=nickname,
                profile_img_url=profile_img_url,
                kakao_access_token=_encrypt_token(kakao_token),
            )
            if kakao_refresh_token:
                user.kakao_refresh_token = _encrypt_token(kakao_refresh_token)
            is_new = True
        else:
            user.nickname = nickname
            user.profile_img_url = profile_img_url
            user.kakao_access_token = _encrypt_token(kakao_token)
            if kakao_refresh_token:
                user.kakao_refresh_token = _encrypt_token(kakao_refresh_token)

        access_token = self._create_token(str(user.id), "access")
        refresh_token = self._create_token(str(user.id), "refresh")

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": str(user.id),
                "nickname": nickname,
                "profile_img_url": profile_img_url,
                "is_new": is_new,
            },
        }

    def _create_token(self, user_id: str, token_type: str) -> str:
        if token_type == "access":
            expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_EXPIRE_MINUTES)
        else:
            expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
        return jwt.encode(
            {"sub": user_id, "type": token_type, "exp": expire},
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

    @staticmethod
    def verify_token(token: str) -> str:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            return payload["sub"]
        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰")
