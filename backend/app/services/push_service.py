import uuid
import json
import logging
from datetime import date, time

from pywebpush import webpush, WebPushException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.medication_schedule import MedicationSchedule
from app.models.notification import Notification
from app.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


class PushService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save_subscription(self, user_id: uuid.UUID, endpoint: str, p256dh: str, auth: str):
        existing = await self.db.execute(
            select(PushSubscription).where(PushSubscription.endpoint == endpoint)
        )
        row = existing.scalar_one_or_none()

        if row:
            row.user_id = user_id
            row.p256dh = p256dh
            row.auth = auth
            row.enabled = True
        else:
            self.db.add(
                PushSubscription(
                    user_id=user_id,
                    endpoint=endpoint,
                    p256dh=p256dh,
                    auth=auth,
                )
            )

        await self.db.commit()

    async def delete_subscription(self, user_id: uuid.UUID, endpoint: str):
        await self.db.execute(
            delete(PushSubscription).where(
                PushSubscription.user_id == user_id,
                PushSubscription.endpoint == endpoint,
            )
        )
        await self.db.commit()

    async def send_medication_reminders(self, target_time: time):
        today = date.today()
        title = f"💊 {target_time.strftime('%H:%M')} 복약 시간이에요!"
        body = "PillMate에서 복약을 체크해주세요."

        result = await self.db.execute(
            select(MedicationSchedule, PushSubscription)
            .join(PushSubscription, PushSubscription.user_id == MedicationSchedule.user_id)
            .where(
                MedicationSchedule.active.is_(True),
                MedicationSchedule.start_date <= today,
                MedicationSchedule.end_date >= today,
                MedicationSchedule.scheduled_time == target_time,
                PushSubscription.enabled.is_(True),
            )
        )

        rows = result.all()
        sent_endpoints = set()
        saved_users = set()

        for schedule, sub in rows:
            if schedule.user_id not in saved_users:
                self.db.add(
                    Notification(
                        user_id=schedule.user_id,
                        title=title,
                        body=body,
                        type="medication_reminder",
                        is_read=False,
                    )
                )
                saved_users.add(schedule.user_id)

            if sub.endpoint in sent_endpoints:
                continue

            sent_endpoints.add(sub.endpoint)
            await self._send(sub, title, body)

        await self.db.commit()

    async def _send(self, sub: PushSubscription, title: str, body: str):
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth,
                    },
                },
                data=json.dumps(
                    {
                        "title": title,
                        "body": body,
                    }
                ),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_EMAIL},
            )
        except WebPushException as e:
            if "410" in str(e) or "404" in str(e):
                await self.db.execute(
                    delete(PushSubscription).where(
                        PushSubscription.endpoint == sub.endpoint
                    )
                )
            else:
                logger.error(f"Push failed: {e}")