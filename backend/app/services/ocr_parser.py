import json
import logging
from dataclasses import dataclass
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ParsedDrug:
    name: str
    dosage: str
    frequency: str
    timing: str
    verified: bool = False


class OCRParser:
    def __init__(self):
        self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def parse_with_llm(self, raw_text: str) -> list[ParsedDrug]:
        logger.info(f"LLM 파싱 시작 - 텍스트 길이: {len(raw_text)}")
        response = await self._client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": """한국어 처방전에서 실제 의약품 정보만 추출하세요.

규칙:
- 처방전에서 '처방 의약품의 명칭' 또는 약품코드(숫자로 시작하는 줄) 옆에 있는 약품명만 추출
- 병원명, 의사명, 환자명, 날짜, 주소, 전화번호, 진단명은 제외
- 약품명은 한글 또는 영문 의약품명만 포함
- dosage: mg, g, ml 단위 포함한 용량
- frequency: "1일 1회", "1일 2회", "1일 3회" 형식으로 통일
- timing: after_meal(식후) | before_meal(식전) | bedtime(취침전) | morning(아침) | evening(저녁) | empty_stomach(공복)

JSON 형식으로만 반환:
{"drugs": [{"name": "약품명", "dosage": "용량", "frequency": "1일 N회", "timing": "after_meal"}]}

약품이 없으면: {"drugs": []}""",
                },
                {"role": "user", "content": f"다음 처방전에서 약품 정보를 추출하세요:\n\n{raw_text}"},
            ],
        )
        data = response.choices[0].message.content
        logger.info(f"LLM 응답: {data}")
        drugs = json.loads(data).get("drugs", [])
        result = [ParsedDrug(**d) for d in drugs]
        logger.info(f"파싱된 약물: {[r.name for r in result]}")
        return result

    async def parse(self, raw_text: str, confidence: float) -> list[ParsedDrug]:
        logger.info(f"파싱 시작 - confidence: {confidence}")
        logger.info(f"raw_text 앞 200자: {raw_text[:200]}")
        if not raw_text.strip():
            logger.warning("raw_text 비어있음")
            return []
        return await self.parse_with_llm(raw_text)
