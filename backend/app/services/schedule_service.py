import uuid
from datetime import date, time, datetime, timedelta, timezone
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.medication_schedule import MedicationSchedule, ScheduleCheck
from app.core.exceptions import NotFoundError

TIMING_DEFAULTS: dict[str, list[time]] = {
    "after_meal":    [time(8, 30), time(13, 0), time(19, 0)],
    "before_meal":   [time(7, 30), time(12, 0), time(18, 0)],
    "bedtime":       [time(21, 30)],
    "morning":       [time(8, 0)],
    "evening":       [time(19, 0)],
    "empty_stomach": [time(7, 0)],
}

FREQ_TO_COUNT: dict[str, int] = {
    "1일 1회": 1,
    "1일 2회": 2,
    "1일 3회": 3,
    "1일 4회": 4,
}


@dataclass
class ScheduleCreateInput:
    user_id: uuid.UUID
    ocr_result_id: uuid.UUID
    drug_name: str
    dosage: str
    frequency: str
    timing: str
    start_date: date
    duration_days: int = 30


class ScheduleService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _resolve_times(self, timing: str, frequency: str) -> list[time]:
        count = FREQ_TO_COUNT.get(frequency, 1)
        candidates = TIMING_DEFAULTS.get(timing, TIMING_DEFAULTS["after_meal"])
        if count == 1:
            return [candidates[0]]
        if count <= len(candidates):
            return candidates[:count]
        base = datetime(2000, 1, 1, 8, 0)
        interval = timedelta(hours=24 // count)
        return [(base + interval * i).time() for i in range(count)]

    async def create_from_ocr(self, inputs: list[ScheduleCreateInput]) -> list[MedicationSchedule]:
        schedules: list[MedicationSchedule] = []
        for inp in inputs:
            times = self._resolve_times(inp.timing, inp.frequency)
            end_date = inp.start_date + timedelta(days=inp.duration_days)
            for t in times:
                s = MedicationSchedule(
                    user_id=inp.user_id,
                    ocr_result_id=inp.ocr_result_id,
                    drug_name=inp.drug_name,
                    dosage=inp.dosage,
                    scheduled_time=t,
                    start_date=inp.start_date,
                    end_date=end_date,
                    active=True,
                )
                self.db.add(s)
                schedules.append(s)
        await self.db.flush()
        return schedules

    async def get_monthly_status(self, user_id: uuid.UUID, year: int, month: int) -> dict:
        from calendar import monthrange
        first = date(year, month, 1)
        last = date(year, month, monthrange(year, month)[1])

        # 해당 월에 활성화된 스케줄
        result = await self.db.execute(
            select(MedicationSchedule).where(
                MedicationSchedule.user_id == user_id,
                MedicationSchedule.active.is_(True),
                MedicationSchedule.start_date <= last,
                MedicationSchedule.end_date >= first,
            )
        )
        schedules = result.scalars().all()
        if not schedules:
            return {}

        schedule_ids = [s.id for s in schedules]
        checks = await self.db.execute(
            select(ScheduleCheck).where(
                ScheduleCheck.schedule_id.in_(schedule_ids),
                ScheduleCheck.check_date.between(first, last),
            )
        )
        check_rows = checks.scalars().all()

        # 날짜별 체크 맵
        checked_map: dict[str, set] = {}
        for c in check_rows:
            key = c.check_date.isoformat()
            if key not in checked_map:
                checked_map[key] = set()
            if c.checked_at:
                checked_map[key].add(str(c.schedule_id))

        # 날짜별 상태 계산
        daily: dict[str, str] = {}
        cursor = first
        while cursor <= last:
            day_str = cursor.isoformat()
            active = [s for s in schedules if s.start_date <= cursor <= s.end_date]
            if not active:
                cursor += timedelta(days=1)
                continue
            done = len(checked_map.get(day_str, set()))
            total = len(active)
            if done == 0:
                daily[day_str] = "none"
            elif done >= total:
                daily[day_str] = "full"
            else:
                daily[day_str] = "partial"
            cursor += timedelta(days=1)

        return daily

    async def get_for_date(self, user_id: uuid.UUID, target: date) -> list[dict]:
        from app.models.ocr_result import OCRResult
        result = await self.db.execute(
            select(MedicationSchedule, ScheduleCheck, OCRResult.prescribed_date)
            .outerjoin(
                ScheduleCheck,
                (ScheduleCheck.schedule_id == MedicationSchedule.id)
                & (ScheduleCheck.check_date == target),
            )
            .outerjoin(OCRResult, OCRResult.id == MedicationSchedule.ocr_result_id)
            .where(
                MedicationSchedule.user_id == user_id,
                MedicationSchedule.active.is_(True),
                MedicationSchedule.start_date <= target,
                MedicationSchedule.end_date >= target,
            )
            .order_by(OCRResult.prescribed_date.desc(), MedicationSchedule.scheduled_time)
        )
        return [
            {
                "id": str(s.id),
                "drug_name": s.drug_name,
                "dosage": s.dosage,
                "scheduled_time": str(s.scheduled_time),
                "checked": check is not None and check.checked_at is not None,
                "checked_at": check.checked_at if check else None,
                "start_date": s.start_date.isoformat(),
                "end_date": s.end_date.isoformat(),
                "ocr_result_id": str(s.ocr_result_id),
                "prescribed_date": prescribed_date.isoformat() if prescribed_date else s.start_date.isoformat(),
            }
            for s, check, prescribed_date in result.all()
        ]

    async def check(self, schedule_id: uuid.UUID, user_id: uuid.UUID, checked: bool) -> dict:
        result = await self.db.execute(
            select(MedicationSchedule).where(
                MedicationSchedule.id == schedule_id,
                MedicationSchedule.user_id == user_id,
            )
        )
        schedule = result.scalar_one_or_none()
        if not schedule:
            raise NotFoundError("MedicationSchedule", str(schedule_id))

        today = date.today()
        existing = await self.db.execute(
            select(ScheduleCheck).where(
                ScheduleCheck.schedule_id == schedule_id,
                ScheduleCheck.check_date == today,
            )
        )
        row = existing.scalar_one_or_none()
        now = datetime.now(timezone.utc) if checked else None
        if row:
            row.checked_at = now
        else:
            self.db.add(ScheduleCheck(
                schedule_id=schedule_id,
                check_date=today,
                checked_at=now,
            ))
        await self.db.flush()
        return {"schedule_id": str(schedule_id), "checked": checked, "checked_at": now}

    async def get_compliance(self, user_id: uuid.UUID, start: date, end: date) -> dict:
        # 해당 기간에 실제로 활성화된 스케줄만 조회 (start_date~end_date 범위 고려)
        result = await self.db.execute(
            select(MedicationSchedule).where(
                MedicationSchedule.user_id == user_id,
                MedicationSchedule.active.is_(True),
                MedicationSchedule.start_date <= end,
                MedicationSchedule.end_date >= start,
            )
        )
        schedules = result.scalars().all()
        if not schedules:
            return {"compliance_rate": 0.0, "streak_days": 0, "total_checked": 0}

        # 스케줄별로 실제 활성 일수 계산
        total_expected = 0
        for s in schedules:
            active_start = max(s.start_date, start)
            active_end = min(s.end_date, end)
            total_expected += (active_end - active_start).days + 1

        schedule_ids = [s.id for s in schedules]
        checks = await self.db.execute(
            select(ScheduleCheck).where(
                ScheduleCheck.schedule_id.in_(schedule_ids),
                ScheduleCheck.check_date.between(start, end),
                ScheduleCheck.checked_at.isnot(None),
            )
        )
        total_checked = len(checks.scalars().all())
        rate = round(total_checked / total_expected, 4) if total_expected else 0.0

        streak = await self._streak(schedule_ids)
        return {"compliance_rate": rate, "streak_days": streak, "total_checked": total_checked}

    async def _streak(self, schedule_ids: list[uuid.UUID]) -> int:
        streak, cursor = 0, date.today()
        while True:
            result = await self.db.execute(
                select(ScheduleCheck).where(
                    ScheduleCheck.schedule_id.in_(schedule_ids),
                    ScheduleCheck.check_date == cursor,
                    ScheduleCheck.checked_at.isnot(None),
                )
            )
            if not result.scalars().all():
                break
            streak += 1
            cursor -= timedelta(days=1)
        return streak


    async def delete(self, schedule_id: uuid.UUID, user_id: uuid.UUID) -> dict:
        from sqlalchemy import delete as sql_delete
        result = await self.db.execute(
            select(MedicationSchedule).where(
                MedicationSchedule.id == schedule_id,
                MedicationSchedule.user_id == user_id,
            )
        )
        schedule = result.scalar_one_or_none()
        if not schedule:
            raise NotFoundError("MedicationSchedule", str(schedule_id))
        await self.db.execute(
            sql_delete(ScheduleCheck).where(ScheduleCheck.schedule_id == schedule_id)
        )
        await self.db.delete(schedule)
        await self.db.flush()
        return {"detail": "삭제되었습니다."}
