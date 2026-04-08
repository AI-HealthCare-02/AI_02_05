import uuid
import json
from datetime import date, timedelta, datetime, timezone
from collections import defaultdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.medication_schedule import MedicationSchedule, ScheduleCheck
from app.models.medication_report import MedicationReport
from app.models.ocr_result import OCRResult


REPORT_SYSTEM_PROMPT = """당신은 ClinicalCare+의 복약 패턴 분석 AI입니다.

환자의 복약 기록 데이터를 분석하여 의료진에게 전달할 수 있는 구조화된 리포트를 생성합니다.

[절대 금지]
- 진단/처방 변경 제안 금지
- 확정적 의학 판단 금지
- "~병입니다" 같은 진단적 표현 금지

[생성해야 할 항목]
1. summary (환자용 요약): 복약 순응도 현황을 친근하고 격려하는 톤으로 3-5줄 요약
2. detail (의사용 상세): 아래 형식으로 의료진이 참고할 수 있는 객관적 데이터 분석
   - 전체 복약 순응도 (%)
   - 약물별 복용 현황
   - 시간대별 복용 패턴 (아침/점심/저녁/취침 전)
   - 누락 패턴 분석 (요일별, 연속 누락 구간)
   - 특이사항
3. recommendations (권고사항): 복약 순응도 개선을 위한 일반적 제안 (1-3개)

[응답 형식]
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트를 포함하지 마세요.
{
  "summary": "...",
  "detail": "...",
  "recommendations": "..."
}"""


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def _collect_data(
        self, user_id: uuid.UUID, start: date, end: date
    ) -> dict:
        """기간 내 복약 데이터 수집 및 통계 산출"""
        # 활성 스케줄 조회
        result = await self.db.execute(
            select(MedicationSchedule, OCRResult.disease_name)
            .outerjoin(OCRResult, OCRResult.id == MedicationSchedule.ocr_result_id)
            .where(
                MedicationSchedule.user_id == user_id,
                MedicationSchedule.active.is_(True),
                MedicationSchedule.start_date <= end,
                MedicationSchedule.end_date >= start,
            )
        )
        rows = result.all()
        if not rows:
            return {"empty": True}

        schedules = [r[0] for r in rows]
        disease_map = {str(r[0].id): r[1] for r in rows}
        schedule_ids = [s.id for s in schedules]

        # 체크 기록 조회
        checks_result = await self.db.execute(
            select(ScheduleCheck).where(
                ScheduleCheck.schedule_id.in_(schedule_ids),
                ScheduleCheck.check_date.between(start, end),
            )
        )
        all_checks = checks_result.scalars().all()

        # -- 통계 계산 --
        # 1) 전체 복약률
        total_expected = 0
        for s in schedules:
            s_start = max(s.start_date, start)
            s_end = min(s.end_date, end)
            total_expected += (s_end - s_start).days + 1

        total_checked = sum(1 for c in all_checks if c.checked_at is not None)
        compliance_rate = round(total_checked / total_expected, 4) if total_expected else 0.0

        # 2) 약물별 통계
        drug_stats: dict[str, dict] = defaultdict(lambda: {"expected": 0, "checked": 0})
        for s in schedules:
            s_start = max(s.start_date, start)
            s_end = min(s.end_date, end)
            days = (s_end - s_start).days + 1
            drug_stats[s.drug_name]["expected"] += days
            drug_stats[s.drug_name]["disease"] = disease_map.get(str(s.id))

        checked_by_schedule = defaultdict(int)
        for c in all_checks:
            if c.checked_at:
                checked_by_schedule[c.schedule_id] += 1

        for s in schedules:
            drug_stats[s.drug_name]["checked"] += checked_by_schedule.get(s.id, 0)

        for name, stat in drug_stats.items():
            stat["rate"] = round(stat["checked"] / stat["expected"], 4) if stat["expected"] else 0.0

        # 3) 시간대별 통계
        time_slots = {"아침(07-09시)": 0, "점심(12-14시)": 0, "저녁(18-20시)": 0, "취침전(21-22시)": 0}
        time_slots_total = {"아침(07-09시)": 0, "점심(12-14시)": 0, "저녁(18-20시)": 0, "취침전(21-22시)": 0}

        def _slot(t):
            h = t.hour
            if 7 <= h < 10:
                return "아침(07-09시)"
            elif 12 <= h < 15:
                return "점심(12-14시)"
            elif 18 <= h < 21:
                return "저녁(18-20시)"
            else:
                return "취침전(21-22시)"

        schedule_map = {s.id: s for s in schedules}
        for s in schedules:
            slot = _slot(s.scheduled_time)
            s_start = max(s.start_date, start)
            s_end = min(s.end_date, end)
            time_slots_total[slot] += (s_end - s_start).days + 1

        for c in all_checks:
            if c.checked_at and c.schedule_id in schedule_map:
                slot = _slot(schedule_map[c.schedule_id].scheduled_time)
                time_slots[slot] += 1

        time_stats = {}
        for slot in time_slots:
            total = time_slots_total[slot]
            checked = time_slots[slot]
            time_stats[slot] = {
                "checked": checked,
                "total": total,
                "rate": round(checked / total, 4) if total else 0.0,
            }

        # 4) 요일별 누락 패턴
        weekday_miss = defaultdict(int)
        weekday_total = defaultdict(int)
        checked_dates_per_schedule = defaultdict(set)
        for c in all_checks:
            if c.checked_at:
                checked_dates_per_schedule[c.schedule_id].add(c.check_date)

        cursor = start
        while cursor <= end:
            wd = cursor.strftime("%A")
            for s in schedules:
                if s.start_date <= cursor <= s.end_date:
                    weekday_total[wd] += 1
                    if cursor not in checked_dates_per_schedule.get(s.id, set()):
                        weekday_miss[wd] += 1
            cursor += timedelta(days=1)

        weekday_stats = {}
        for wd in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]:
            ko = {"Monday": "월", "Tuesday": "화", "Wednesday": "수", "Thursday": "목",
                   "Friday": "금", "Saturday": "토", "Sunday": "일"}[wd]
            t = weekday_total.get(wd, 0)
            m = weekday_miss.get(wd, 0)
            weekday_stats[ko] = {"total": t, "missed": m, "miss_rate": round(m / t, 4) if t else 0.0}

        # 5) 연속 누락 구간 탐지
        consecutive_misses = []
        for s in schedules:
            s_start = max(s.start_date, start)
            s_end = min(s.end_date, end)
            checked_dates = checked_dates_per_schedule.get(s.id, set())
            miss_streak_start = None
            miss_count = 0
            cursor = s_start
            while cursor <= s_end:
                if cursor not in checked_dates:
                    if miss_streak_start is None:
                        miss_streak_start = cursor
                    miss_count += 1
                else:
                    if miss_count >= 2:
                        consecutive_misses.append({
                            "drug": s.drug_name,
                            "start": miss_streak_start.isoformat(),
                            "end": (cursor - timedelta(days=1)).isoformat(),
                            "days": miss_count,
                        })
                    miss_streak_start = None
                    miss_count = 0
                cursor += timedelta(days=1)
            if miss_count >= 2:
                consecutive_misses.append({
                    "drug": s.drug_name,
                    "start": miss_streak_start.isoformat(),
                    "end": s_end.isoformat(),
                    "days": miss_count,
                })

        # 6) 연속 복약 streak
        streak = 0
        cursor = date.today()
        while cursor >= start:
            day_ok = True
            for s in schedules:
                if s.start_date <= cursor <= s.end_date:
                    if cursor not in checked_dates_per_schedule.get(s.id, set()):
                        day_ok = False
                        break
            if day_ok:
                streak += 1
                cursor -= timedelta(days=1)
            else:
                break

        stats_json = {
            "drug_stats": {k: v for k, v in drug_stats.items()},
            "time_stats": time_stats,
            "weekday_stats": weekday_stats,
            "consecutive_misses": consecutive_misses[:10],
        }

        return {
            "empty": False,
            "compliance_rate": compliance_rate,
            "total_scheduled": total_expected,
            "total_checked": total_checked,
            "streak_days": streak,
            "stats_json": stats_json,
            "period": f"{start.isoformat()} ~ {end.isoformat()}",
        }

    async def _generate_with_llm(self, data: dict) -> dict:
        """LLM으로 리포트 텍스트 생성"""
        user_prompt = f"""아래 복약 데이터를 분석하여 리포트를 생성해주세요.

[기간] {data['period']}
[전체 복약률] {data['compliance_rate'] * 100:.1f}% ({data['total_checked']}/{data['total_scheduled']})
[연속 복약 일수] {data['streak_days']}일

[약물별 현황]
{json.dumps(data['stats_json']['drug_stats'], ensure_ascii=False, indent=2)}

[시간대별 현황]
{json.dumps(data['stats_json']['time_stats'], ensure_ascii=False, indent=2)}

[요일별 누락 패턴]
{json.dumps(data['stats_json']['weekday_stats'], ensure_ascii=False, indent=2)}

[연속 누락 구간]
{json.dumps(data['stats_json']['consecutive_misses'], ensure_ascii=False, indent=2)}
"""
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": REPORT_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=1500,
                temperature=0.4,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content or "{}"
            return json.loads(content)
        except Exception as e:
            return {
                "summary": f"리포트 생성 중 오류가 발생했습니다: {str(e)}",
                "detail": "데이터는 수집되었으나 AI 분석을 완료하지 못했습니다.",
                "recommendations": "잠시 후 다시 시도해주세요.",
            }

    async def generate_report(
        self, user_id: uuid.UUID, report_type: str = "weekly",
        start_date: date | None = None, end_date: date | None = None,
    ) -> MedicationReport:
        """복약 패턴 리포트 생성 (주간/월간)"""
        today = date.today()
        if not end_date:
            end_date = today
        if not start_date:
            if report_type == "monthly":
                start_date = today - timedelta(days=30)
            else:
                start_date = today - timedelta(days=7)

        # 데이터 수집
        data = await self._collect_data(user_id, start_date, end_date)

        if data.get("empty"):
            report = MedicationReport(
                user_id=user_id,
                report_type=report_type,
                period_start=start_date,
                period_end=end_date,
                compliance_rate=0.0,
                total_scheduled=0,
                total_checked=0,
                streak_days=0,
                stats_json={},
                summary="해당 기간에 등록된 복약 일정이 없습니다.",
                detail="복약 일정이 없어 분석할 데이터가 없습니다.",
                recommendations="처방전을 촬영하여 복약 일정을 등록해주세요.",
            )
            self.db.add(report)
            await self.db.flush()
            await self.db.commit()
            return report

        # LLM 생성
        llm_result = await self._generate_with_llm(data)

        report = MedicationReport(
            user_id=user_id,
            report_type=report_type,
            period_start=start_date,
            period_end=end_date,
            compliance_rate=data["compliance_rate"],
            total_scheduled=data["total_scheduled"],
            total_checked=data["total_checked"],
            streak_days=data["streak_days"],
            stats_json=data["stats_json"],
            summary=llm_result.get("summary", ""),
            detail=llm_result.get("detail", ""),
            recommendations=llm_result.get("recommendations"),
        )
        self.db.add(report)
        await self.db.flush()
        await self.db.commit()
        return report

    async def list_reports(self, user_id: uuid.UUID, limit: int = 10) -> list[dict]:
        """사용자의 리포트 목록 조회"""
        result = await self.db.execute(
            select(MedicationReport)
            .where(MedicationReport.user_id == user_id)
            .order_by(MedicationReport.created_at.desc())
            .limit(limit)
        )
        reports = result.scalars().all()
        return [
            {
                "id": str(r.id),
                "report_type": r.report_type,
                "period_start": r.period_start.isoformat(),
                "period_end": r.period_end.isoformat(),
                "compliance_rate": r.compliance_rate,
                "total_scheduled": r.total_scheduled,
                "total_checked": r.total_checked,
                "streak_days": r.streak_days,
                "summary": r.summary,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reports
        ]

    async def get_report(self, report_id: uuid.UUID) -> MedicationReport | None:
        result = await self.db.execute(
            select(MedicationReport).where(MedicationReport.id == report_id)
        )
        return result.scalar_one_or_none()

    async def get_report_for_doctor(self, report_id: uuid.UUID, user_id: uuid.UUID) -> dict | None:
        """의사 공유용 리포트 전체 데이터 반환"""
        result = await self.db.execute(
            select(MedicationReport).where(
                MedicationReport.id == report_id,
                MedicationReport.user_id == user_id,
            )
        )
        report = result.scalar_one_or_none()
        if not report:
            return None

        return {
            "id": str(report.id),
            "report_type": report.report_type,
            "period_start": report.period_start.isoformat(),
            "period_end": report.period_end.isoformat(),
            "compliance_rate": report.compliance_rate,
            "total_scheduled": report.total_scheduled,
            "total_checked": report.total_checked,
            "streak_days": report.streak_days,
            "stats_json": report.stats_json,
            "summary": report.summary,
            "detail": report.detail,
            "recommendations": report.recommendations,
            "created_at": report.created_at.isoformat() if report.created_at else None,
        }
