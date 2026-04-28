import uuid
import json
import logging
import httpx
from datetime import date, time
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

    async def _get_valid_kakao_token(self, user) -> str | None:
        from app.services.auth_service import _decrypt_token, _encrypt_token
        raw_token = _decrypt_token(user.kakao_access_token)
        # 토큰 유효성 확인
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://kapi.kakao.com/v1/user/access_token_info",
                headers={"Authorization": f"Bearer {raw_token}"},
            )
        if resp.status_code == 200:
            return raw_token
        # 만료됐으면 refresh token으로 갱신
        if not user.kakao_refresh_token:
            logger.warning(f"refresh token 없음: {user.nickname}")
            return None
        raw_refresh = _decrypt_token(user.kakao_refresh_token)
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://kauth.kakao.com/oauth/token",
                data={
                    "grant_type": "refresh_token",
                    "client_id": settings.KAKAO_REST_API_KEY,
                    "refresh_token": raw_refresh,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
        if resp.status_code != 200:
            logger.warning(f"토큰 갱신 실패: {user.nickname}")
            return None
        new_token = resp.json()["access_token"]
        user.kakao_access_token = _encrypt_token(new_token)
        if "refresh_token" in resp.json():
            user.kakao_refresh_token = _encrypt_token(resp.json()["refresh_token"])
        await self.db.flush()
        logger.info(f"토큰 갱신 성공: {user.nickname}")
        return new_token

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
                        "link": {"web_url": "https://pill-mate-six.vercel.app/schedule", "mobile_web_url": "https://pill-mate-six.vercel.app/schedule"},
                    })},
                )
            if resp.status_code != 200:
                logger.warning(f"카카오 메시지 실패 ({resp.status_code}): {resp.text}")
        except Exception as e:
            logger.error(f"카카오 메시지 오류: {e}")

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
        user_drugs: dict[str, tuple[str, list[str]]] = {}
        for schedule, user in kakao_rows:
            uid = str(user.id)
            if uid not in user_drugs:
                user_drugs[uid] = (user.kakao_access_token, [])
            user_drugs[uid][1].append(schedule.drug_name)
        time_str = target_time.strftime("%H:%M")
        for token, drug_names in user_drugs.values():
            from app.services.auth_service import _decrypt_token
            await self.send_kakao_message(_decrypt_token(token), drug_names, time_str)

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

    async def send_evening_summary(self):
        """저녁 8시 복약 현황 요약 알림"""
        today = date.today()
        kakao_result = await self.db.execute(
            select(User)
            .where(User.kakao_access_token.isnot(None), User.is_active.is_(True))
        )
        users = kakao_result.scalars().all()

        for user in users:
            schedules = await self.db.execute(
                select(MedicationSchedule)
                .where(
                    MedicationSchedule.user_id == user.id,
                    MedicationSchedule.active.is_(True),
                    MedicationSchedule.start_date <= today,
                    MedicationSchedule.end_date >= today,
                )
            )
            all_schedules = schedules.scalars().all()
            if not all_schedules:
                continue

            from app.models.medication_schedule import ScheduleCheck
            checks = await self.db.execute(
                select(ScheduleCheck).where(
                    ScheduleCheck.schedule_id.in_([s.id for s in all_schedules]),
                    ScheduleCheck.check_date == today,
                    ScheduleCheck.checked_at.isnot(None),
                )
            )
            checked_ids = {c.schedule_id for c in checks.scalars().all()}
            total = len(all_schedules)
            done = len(checked_ids)
            undone = total - done

            if undone == 0:
                msg = f"🎉 오늘 복약 완료!\n\n✅ {done}개 모두 복용했어요.\n건강한 하루 보내셨나요?"
            else:
                undone_names = [s.drug_name for s in all_schedules if s.id not in checked_ids][:3]
                names = ", ".join(undone_names)
                msg = f"💊 오늘 복약 현황\n\n✅ 완료: {done}개\n❌ 미복약: {undone}개\n\n아직 복용 안 한 약: {names}\n\nPillMate에서 확인해주세요."

            try:
                token = await self._get_valid_kakao_token(user)
                if not token:
                    continue
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        "https://kapi.kakao.com/v2/api/talk/memo/default/send",
                        headers={"Authorization": f"Bearer {token}"},
                        data={"template_object": json.dumps({
                            "object_type": "text",
                            "text": msg,
                            "link": {"web_url": "https://pill-mate-six.vercel.app/schedule",
                                     "mobile_web_url": "https://pill-mate-six.vercel.app/schedule"},
                        })},
                    )
                if resp.status_code != 200:
                    logger.warning(f"저녁 요약 알림 실패 ({resp.status_code}): {resp.text}")
                else:
                    logger.info(f"저녁 요약 알림 성공: {user.nickname}")
            except Exception as e:
                logger.error(f"저녁 요약 알림 오류: {e}")
