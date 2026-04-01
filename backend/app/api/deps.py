import uuid
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.auth_service import AuthService
from app.services.ocr_service import OCRService
from app.services.schedule_service import ScheduleService
from app.services.drug_service import DrugService
from app.services.s3_service import S3Service

bearer = HTTPBearer(auto_error=False)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    x_user_id: str | None = Header(None, alias="X-User-Id"),
) -> uuid.UUID:
    # JWT 우선, 없으면 X-User-Id (개발용)
    if credentials:
        user_id_str = AuthService.verify_token(credentials.credentials)
        return uuid.UUID(user_id_str)
    if x_user_id:
        try:
            return uuid.UUID(x_user_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid X-User-Id")
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증이 필요합니다")


def get_ocr_service(db: AsyncSession = Depends(get_db)) -> OCRService:
    return OCRService(db)


def get_schedule_service(db: AsyncSession = Depends(get_db)) -> ScheduleService:
    return ScheduleService(db)


def get_drug_service(db: AsyncSession = Depends(get_db)) -> DrugService:
    return DrugService(db)


_s3 = S3Service()


def get_s3_service() -> S3Service:
    return _s3
