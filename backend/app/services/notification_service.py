import uuid

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_notifications(
        self,
        user_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ):
        result = await self.db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.sent_at.desc(), Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_notification(
        self,
        user_id: uuid.UUID,
        notification_id: uuid.UUID,
    ):
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def mark_as_read(
        self,
        user_id: uuid.UUID,
        notification_id: uuid.UUID,
    ):
        notification = await self.get_notification(user_id, notification_id)
        if notification is None:
            return None

        notification.is_read = True
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def mark_as_unread(
        self,
        user_id: uuid.UUID,
        notification_id: uuid.UUID,
    ):
        notification = await self.get_notification(user_id, notification_id)
        if notification is None:
            return None

        notification.is_read = False
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def mark_all_as_read(self, user_id: uuid.UUID) -> int:
        result = await self.db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
            .values(is_read=True)
        )
        await self.db.commit()
        return result.rowcount or 0

    async def unread_count(self, user_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        )
        return result.scalar_one()