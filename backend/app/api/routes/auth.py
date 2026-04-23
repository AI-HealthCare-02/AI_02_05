from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.auth_service import AuthService
from app.api.deps import get_current_user_id
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/kakao")
async def kakao_login(code: str, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.kakao_login(code)
    await db.commit()
    return result


@router.delete("/withdraw")
async def withdraw(user_id: uuid.UUID = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models.user import User
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        user.kakao_access_token = None
        await db.flush()
        await db.delete(user)
        await db.commit()
    return {"detail": "탈퇴가 완료되었어요."}
