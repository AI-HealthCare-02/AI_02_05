import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    body: str
    type: str
    is_read: bool
    sent_at: datetime
    created_at: datetime

    @classmethod
    def from_model(cls, notification):
        return cls(
            id=notification.id,
            user_id=notification.user_id,
            title=notification.title,
            body=notification.body,
            type=notification.type,
            is_read=notification.is_read,
            sent_at=notification.sent_at,
            created_at=notification.created_at,
        )


class MarkAllReadResponse(BaseModel):
    detail: str
    updated_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    notifications = await service.list_notifications(
        user_id=user_id,
        limit=limit,
        offset=offset,
    )
    return [NotificationResponse.from_model(n) for n in notifications]


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    count = await service.unread_count(user_id=user_id)
    return UnreadCountResponse(unread_count=count)


@router.patch("/read-all", response_model=MarkAllReadResponse)
async def mark_all_as_read(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    updated_count = await service.mark_all_as_read(user_id=user_id)
    return MarkAllReadResponse(
        detail="모든 알림을 읽음 처리했습니다.",
        updated_count=updated_count,
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    notification = await service.mark_as_read(
        user_id=user_id,
        notification_id=notification_id,
    )

    if notification is None:
        raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다.")

    return NotificationResponse.from_model(notification)


@router.patch("/{notification_id}/unread", response_model=NotificationResponse)
async def mark_notification_as_unread(
    notification_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    notification = await service.mark_as_unread(
        user_id=user_id,
        notification_id=notification_id,
    )

    if notification is None:
        raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다.")

    return NotificationResponse.from_model(notification)