from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/kakao")
async def kakao_login(code: str, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.kakao_login(code)
    await db.commit()
    return result
