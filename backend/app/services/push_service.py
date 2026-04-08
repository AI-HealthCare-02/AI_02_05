import uuid
import json
import logging
import httpx
from datetime import date, time, timedelta
from pywebpush import webpush, WebPushException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.config import settings
from app.models.push_subscription import PushSubscription
from app.models.medication_schedule import MedicationSchedule
from app.models.user import User

logger = logging.getLogger(__name__)


class PushService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_kakao_message(self, kakao_token: str, drug_names: list[str], time_str: str):
        names = ", ".join(drug_names[:3]) + (f" 외 {len(drug_names)-3}종" if len(drug_names) > 3 else "")
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://kapi.kakao.com/v2/api/talk/memo/default/send",
                    headers={"Authorization": f"Bearer {kakao_token}"},
                    data={"template_object": json.dumps({
                        "object_type": "text",
                        "text": f"💊 {time_str} 복약 시간이에요!\n\n{names}\n\nPillMate에서 복약을 체크해주세요.",
                        "link": {"web_url": "http://3.34.192.109/schedule", "mobile_web_url": "http://3.34.192.109/schedule"},
                    })},
                )
            if resp.status_code != 200:
                logger.warning(f"카카오 메시지 실패 ({resp.status_code}): {resp.text}")
        except Exception as e:
            logger.error(f"카카오 메시지 오류: {e}")


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
            self.db.add(PushSubscription(
                user_id=user_id, endpoint=endpoint, p256dh=p256dh, auth=auth
            ))
        await self.db.flush()

    async def delete_subscription(self, user_id: uuid.UUID, endpoint: str):
        await self.db.execute(
            delete(PushSubscription).where(
                PushSubscription.user_id == user_id,
                PushSubscription.endpoint == endpoint,
            )
        )
        await self.db.flush()

    async def send_medication_reminders(self, target_time: time):
        today = date.today()
        # Web Push
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
        for schedule, sub in rows:
            if sub.endpoint in sent_endpoints:
                continue
            sent_endpoints.add(sub.endpoint)
            await self._send(sub, f"💊 {target_time.strftime('%H:%M')} 복약 시간이에요!", "PillMate에서 복약을 체크해주세요.")

        # 카카오 나에게 보내기
        kakao_result = await self.db.execute(
            select(MedicationSchedule, User)
            .join(User, User.id == MedicationSchedule.user_id)
            .where(
                MedicationSchedule.active.is_(True),
                MedicationSchedule.start_date <= today,
                MedicationSchedule.end_date >= today,
                MedicationSchedule.scheduled_time == target_time,
                User.kakao_access_token.isnot(None),
            )
        )
        kakao_rows = kakao_result.all()
        # user_id별로 그룹핑
        user_drugs: dict[str, tuple[str, list[str]]] = {}
        for schedule, user in kakao_rows:
            uid = str(user.id)
            if uid not in user_drugs:
                user_drugs[uid] = (user.kakao_access_token, [])
            user_drugs[uid][1].append(schedule.drug_name)
        time_str = target_time.strftime("%H:%M")
        for token, drug_names in user_drugs.values():
            await self.send_kakao_message(token, drug_names, time_str)

    async def _send(self, sub: PushSubscription, title: str, body: str):
        try:
            webpush(
                subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                data=json.dumps({"title": title, "body": body}),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_EMAIL},
            )
        except WebPushException as e:
            if "410" in str(e) or "404" in str(e):
                await self.db.execute(delete(PushSubscription).where(PushSubscription.endpoint == sub.endpoint))
            else:
                logger.error(f"Push failed: {e}")
