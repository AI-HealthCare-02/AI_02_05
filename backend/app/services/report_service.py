"""
report_service.py 패치 버전 — OpenAI 키가 없거나 호출 실패 시
rule-based 폴백으로 자연스러운 summary/detail/recommendations 생성.

사용법:
  backend/app/services/report_service.py 를 이 파일로 덮어쓰기.

원본과의 차이:
  1. settings.OPENAI_API_KEY 가 비어있으면 OpenAI 클라이언트를 초기화하지 않음
  2. LLM 호출 실패/키없음 시 _rule_based_summary() 가 통계 데이터 기반으로
     한글 요약문을 자동 생성 (summary/detail/recommendations 각각)
  3. 생성된 리포트에 source 필드는 없고, ai_analysis 는 그대로 DB 필드에 저장

원본 로직 (수집/통계/LLM 호출)은 그대로 유지.
"""
import uuid
import json
from datetime import date, timedelta, datetime, timezone
from collections import defaultdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

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
        # OpenAI 키가 있을 때만 클라이언트 생성
        api_key = getattr(settings, "OPENAI_API_KEY", None)
        if api_key and api_key.strip() and api_key.startswith("sk-"):
            try:
                from openai import AsyncOpenAI
                self.client = AsyncOpenAI(api_key=api_key)
            except Exception:
                self.client = None
        else:
            self.client = None

    # ────────────────────────── 데이터 수집 (원본 그대로) ──────────────────────────
    async def _collect_data(
        self, user_id: uuid.UUID, start: date, end: date
    ) -> dict:
        """기간 내 복약 데이터 수집 및 통계 산출"""
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

        checks_result = await self.db.execute(
            select(ScheduleCheck).where(
                ScheduleCheck.schedule_id.in_(schedule_ids),
                ScheduleCheck.check_date.between(start, end),
            )
        )
        all_checks = checks_result.scalars().all()

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

        # 5) 연속 누락 구간
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

    # ────────────────────── Rule-based 폴백 (신규 추가) ──────────────────────
    def _rule_based_summary(self, data: dict) -> dict:
        """OpenAI 없이 통계만으로 summary/detail/recommendations 생성."""
        rate_pct = data["compliance_rate"] * 100
        streak = data["streak_days"]
        stats = data["stats_json"]
        drug_stats = stats.get("drug_stats", {})
        time_stats = stats.get("time_stats", {})
        weekday_stats = stats.get("weekday_stats", {})
        misses = stats.get("consecutive_misses", [])

        # ─── summary (환자용, 격려하는 톤) ───
        if rate_pct >= 90:
            headline = f"이번 기간 복약률이 {rate_pct:.0f}%로 아주 훌륭해요! 👏"
            tone = "꾸준한 실천이 인상적이에요. 지금 흐름을 유지해 주세요."
        elif rate_pct >= 75:
            headline = f"복약률 {rate_pct:.0f}% - 대체로 잘 지키고 계세요."
            tone = "몇 번의 누락만 보완하면 완벽해질 수 있어요."
        elif rate_pct >= 50:
            headline = f"복약률 {rate_pct:.0f}% - 절반은 넘겼지만 개선 여지가 있어요."
            tone = "어떤 시간대·요일에 자주 놓치는지 아래에서 확인해 보세요."
        else:
            headline = f"복약률 {rate_pct:.0f}% - 최근 누락이 잦았네요."
            tone = "조금만 더 신경 쓰면 금방 회복할 수 있어요. 함께 개선해 봐요."

        streak_line = (
            f"현재 {streak}일 연속 복약을 이어가고 있어요. 정말 잘하고 계세요!"
            if streak >= 3 else
            "연속 복약 기록을 다시 쌓아볼까요? 오늘부터 시작이에요."
        )
        summary = f"{headline}\n{tone}\n{streak_line}"

        # ─── detail (의사용, 객관적 톤) ───
        lines = [
            f"■ 전체 복약 순응도: {rate_pct:.1f}% ({data['total_checked']}/{data['total_scheduled']}회)",
            f"■ 연속 복약 일수: {streak}일",
        ]

        # 약물별
        if drug_stats:
            lines.append("\n■ 약물별 복용 현황:")
            for name, s in sorted(drug_stats.items(), key=lambda x: x[1]["rate"]):
                disease = s.get("disease")
                disease_str = f" [{disease}]" if disease else ""
                lines.append(
                    f"  · {name}{disease_str}: {s['rate']*100:.0f}% "
                    f"({s['checked']}/{s['expected']}회)"
                )

        # 시간대별
        if time_stats:
            lines.append("\n■ 시간대별 복용 패턴:")
            for slot, s in time_stats.items():
                if s["total"] > 0:
                    lines.append(f"  · {slot}: {s['rate']*100:.0f}% ({s['checked']}/{s['total']})")

        # 요일별 누락
        if weekday_stats:
            weak_days = sorted(
                [(k, v) for k, v in weekday_stats.items() if v["total"] > 0],
                key=lambda x: -x[1]["miss_rate"],
            )[:3]
            if weak_days and weak_days[0][1]["missed"] > 0:
                parts = [f"{wd}요일({v['missed']}회)" for wd, v in weak_days if v["missed"] > 0]
                lines.append(f"\n■ 누락 패턴 (요일별): " + ", ".join(parts) + " 순으로 누락 빈도 높음")

        # 연속 누락
        if misses:
            lines.append(f"\n■ 연속 누락 구간: 총 {len(misses)}건 감지")
            for m in misses[:3]:
                lines.append(f"  · {m['drug']}: {m['start']} ~ {m['end']} ({m['days']}일)")

        lines.append(
            "\n■ 특이사항: 본 분석은 기록 기반 통계 결과이며, "
            "진단이나 처방 변경은 담당 의사의 판단이 필요합니다."
        )
        detail = "\n".join(lines)

        # ─── recommendations ───
        recs_list = []

        # 시간대 취약점 기반
        weakest_slot = None
        if time_stats:
            candidates = [(k, v) for k, v in time_stats.items() if v["total"] > 0]
            if candidates:
                weakest_slot = min(candidates, key=lambda x: x[1]["rate"])
                if weakest_slot[1]["rate"] < 0.8:
                    recs_list.append(
                        f"{weakest_slot[0]} 복용이 가장 약한 구간입니다. "
                        f"해당 시간에 알람을 추가로 설정하거나 일상 루틴(식사·양치 등)과 연결해 보세요."
                    )

        # 연속 누락 있으면
        if misses:
            recs_list.append(
                "2일 이상 연속 누락이 감지되었습니다. "
                "누락이 길어질 경우 약효가 떨어질 수 있으니, 보호자 알림 기능이나 "
                "주간 점검 습관을 함께 사용해 보시길 권장합니다."
            )

        # 약물별 편차
        if drug_stats:
            rates = [s["rate"] for s in drug_stats.values() if s["expected"] > 0]
            if rates and (max(rates) - min(rates)) > 0.2:
                worst_drug = min(drug_stats.items(), key=lambda x: x[1]["rate"])
                recs_list.append(
                    f"{worst_drug[0]}의 복약률({worst_drug[1]['rate']*100:.0f}%)이 다른 약보다 낮습니다. "
                    "복용 시간이 다르거나 부작용이 있는지 담당 의사와 상의해 보세요."
                )

        # 기본 권고 (항상 포함)
        if not recs_list:
            recs_list.append("현재 복약 습관이 잘 유지되고 있습니다. 이 흐름을 계속 유지해 주세요.")
        recs_list.append("약 복용에 변화나 부작용이 있을 경우 담당 의사·약사와 상담해 주세요.")

        recommendations = "\n".join(f"• {r}" for r in recs_list[:4])

        return {
            "summary": summary,
            "detail": detail,
            "recommendations": recommendations,
        }

    # ────────────────────── LLM 호출 (폴백 연동) ──────────────────────
    async def _generate_with_llm(self, data: dict) -> dict:
        """LLM 으로 리포트 생성. 키 없음/실패 시 rule-based 폴백."""
        # 1) 클라이언트가 아예 없으면 즉시 폴백
        if self.client is None:
            return self._rule_based_summary(data)

        # 2) 호출 시도
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
            parsed = json.loads(content)
            # 필수 필드 방어
            if not parsed.get("summary"):
                raise ValueError("no summary in response")
            return {
                "summary": parsed.get("summary", ""),
                "detail": parsed.get("detail", ""),
                "recommendations": parsed.get("recommendations", ""),
            }
        except Exception as e:
            # LLM 실패 → 폴백
            import logging
            logging.getLogger(__name__).warning(f"LLM failed, using rule-based: {e}")
            return self._rule_based_summary(data)

    # ────────────────────── 리포트 생성 (원본 그대로) ──────────────────────
    async def generate_report(
        self, user_id: uuid.UUID, report_type: str = "weekly",
        start_date: date | None = None, end_date: date | None = None,
    ) -> MedicationReport:
        today = date.today()
        if not end_date:
            end_date = today
        if not start_date:
            if report_type == "monthly":
                start_date = today - timedelta(days=30)
            else:
                start_date = today - timedelta(days=7)

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
                summary="해당 기간에 등록된 복약 일정이 없습니다.\n처방전을 등록하고 며칠간 복약 체크를 기록한 뒤 다시 생성해 주세요.",
                detail="복약 일정이 없어 분석할 데이터가 없습니다.",
                recommendations="처방전을 촬영하여 복약 일정을 먼저 등록해 주세요.",
            )
            self.db.add(report)
            await self.db.flush()
            await self.db.commit()
            return report

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
