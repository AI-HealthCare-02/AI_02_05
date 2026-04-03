import uuid
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.share_token import ShareToken
from app.models.user import User
from app.services.schedule_service import ScheduleService

router = APIRouter(prefix="/share", tags=["share"])


class CreateShareRequest(BaseModel):
    label: str = "보호자 공유"
    expires_days: int | None = 30  # None = 무제한


@router.post("/")
async def create_share(
    body: CreateShareRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    expires_at = None
    if body.expires_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=body.expires_days)
    token = ShareToken(user_id=user_id, label=body.label, expires_at=expires_at)
    db.add(token)
    await db.flush()
    await db.commit()
    return {"token": token.token, "label": token.label, "expires_at": expires_at}


@router.get("/list")
async def list_shares(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ShareToken).where(ShareToken.user_id == user_id).order_by(ShareToken.created_at.desc())
    )
    tokens = result.scalars().all()
    now = datetime.now(timezone.utc)
    return [
        {
            "id": str(t.id),
            "token": t.token,
            "label": t.label,
            "expires_at": t.expires_at,
            "expired": t.expires_at is not None and t.expires_at < now,
        }
        for t in tokens
    ]


@router.delete("/{token_id}")
async def delete_share(
    token_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(ShareToken).where(ShareToken.id == token_id, ShareToken.user_id == user_id)
    )
    await db.commit()
    return {"detail": "삭제되었습니다."}


@router.get("/{token}/view")
async def view_share(
    token: str,
    target_date: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ShareToken).where(ShareToken.token == token))
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="유효하지 않은 공유 링크입니다.")
    now = datetime.now(timezone.utc)
    if share.expires_at and share.expires_at < now:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="만료된 공유 링크입니다.")

    user_result = await db.execute(select(User).where(User.id == share.user_id))
    user = user_result.scalar_one_or_none()

    view_date = target_date or date.today()
    service = ScheduleService(db)
    schedules = await service.get_for_date(share.user_id, view_date)

    return {
        "nickname": user.nickname if user else "사용자",
        "profile_img_url": user.profile_img_url if user else None,
        "date": view_date.isoformat(),
        "schedules": schedules,
        "label": share.label,
    }
