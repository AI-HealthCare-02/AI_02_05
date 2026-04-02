import uuid
import json
import redis.asyncio as aioredis
from typing import AsyncGenerator
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings

MEDICATION_CONTEXT_TEMPLATE = """
[현재 복약 중인 약물 정보]
{drug_list}
위 약물 정보를 바탕으로 사용자 질문에 맞춤 답변하세요. 약물명이 언급되면 위 목록과 연결해서 답변하세요.
"""

SYSTEM_PROMPT = """당신은 ClinicalCare+의 AI 건강 상담 챗봇입니다.

[절대 금지 사항 — 반드시 준수]
1. 질병 진단 금지: "~병입니다", "~증상입니다" 같은 확정적 진단 표현 절대 사용 금지
2. 처방 금지: 특정 처방약 추천 또는 복용량 지정 절대 금지
3. 처방 변경 금지: 의사가 처방한 약물 변경, 중단, 추가 권고 절대 금지
4. 대체 의료 금지: 민간요법, 한방 처방, 검증되지 않은 치료법 추천 금지
5. 응급 상황: 응급 증상(흉통, 호흡곤란, 의식저하 등) 감지 시 반드시 "즉시 119에 연락하세요"를 첫 줄에 출력

[반드시 지켜야 할 표현 규칙]
- "~일 수 있습니다", "~가능성이 있습니다" 등 불확실 표현 사용
- "의사 또는 약사와 상담하세요" 문구 답변 끝에 항상 포함
- 면책 고지 문구는 포함하지 않음 (UI에 이미 표시됨)

[답변 가능한 범위]
- 복약 방법, 복약 시간, 식전/식후 복용 일반 정보
- 약물 보관 방법
- 일반적인 약물 부작용 정보 (확정 진단 아닌 일반 정보로만)
- 건강한 생활습관 조언
- 병원/약국 방문 권유

[답변 형식]
- 한국어로 답변
- 200자 이내로 간결하게
- 친절하고 이해하기 쉽게"""


class ChatService:
    def __init__(self, db: AsyncSession):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.db = db

    async def _get_medication_context(self, user_id: uuid.UUID) -> str:
        from datetime import date
        from sqlalchemy import select
        from app.models.medication_schedule import MedicationSchedule
        today = date.today()
        result = await self.db.execute(
            select(MedicationSchedule.drug_name, MedicationSchedule.dosage, MedicationSchedule.scheduled_time)
            .where(
                MedicationSchedule.user_id == user_id,
                MedicationSchedule.active.is_(True),
                MedicationSchedule.start_date <= today,
                MedicationSchedule.end_date >= today,
            )
            .order_by(MedicationSchedule.scheduled_time)
        )
        rows = result.all()
        if not rows:
            return ""
        drug_list = "\n".join(
            f"- {r.drug_name} {r.dosage} ({str(r.scheduled_time)[:5]})"
            for r in rows
        )
        return MEDICATION_CONTEXT_TEMPLATE.format(drug_list=drug_list)

    async def stream(
        self,
        user_id: uuid.UUID,
        message: str,
        session_id: str | None = None,
    ) -> AsyncGenerator[str, None]:
        history = await self._get_history(str(user_id))
        med_context = await self._get_medication_context(user_id)
        system_content = SYSTEM_PROMPT + (med_context if med_context else "")
        messages = [{"role": "system", "content": system_content}]
        messages.extend(history)
        messages.append({"role": "user", "content": message})

        full_response = ""
        try:
            stream = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                stream=True,
                max_tokens=300,
                temperature=0.5,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    full_response += delta
                    yield f"data: {json.dumps({'type': 'token', 'content': delta}, ensure_ascii=False)}\n\n"

            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
            await self._save_history(str(user_id), message, full_response)

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': '오류가 발생했어요. 다시 시도해주세요.'}, ensure_ascii=False)}\n\n"

    async def _get_history(self, user_id: str) -> list[dict]:
        try:
            r = aioredis.from_url(settings.REDIS_URL)
            raw = await r.get(f"chat:{user_id}")
            await r.aclose()
            if raw:
                return json.loads(raw)[-10:]
        except Exception:
            pass
        return []

    async def _save_history(self, user_id: str, user_msg: str, assistant_msg: str):
        try:
            r = aioredis.from_url(settings.REDIS_URL)
            raw = await r.get(f"chat:{user_id}")
            history = json.loads(raw) if raw else []
            history.append({"role": "user", "content": user_msg})
            history.append({"role": "assistant", "content": assistant_msg})
            await r.set(f"chat:{user_id}", json.dumps(history, ensure_ascii=False), ex=86400)
            await r.aclose()
        except Exception:
            pass
