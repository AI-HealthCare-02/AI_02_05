import re
import json
from dataclasses import dataclass, field
from openai import AsyncOpenAI
from app.core.config import settings

TIMING_MAP = {
    "식후": "after_meal",
    "식전": "before_meal",
    "취침": "bedtime",
    "공복": "empty_stomach",
    "아침": "morning",
    "저녁": "evening",
}

DRUG_LINE_PATTERN = re.compile(
    r"(?P<name>[\w가-힣]+(?:\s[\w가-힣]+)?)\s*"
    r"(?P<dosage>\d+\.?\d*\s*(?:mg|g|ml|mcg))?\s*"
    r"(?P<freq>1일\s*\d+\s*회)?\s*"
    r"(?P<timing>식후|식전|취침|공복|아침|저녁)?",
    re.MULTILINE,
)


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

    def parse_rule_based(self, raw_text: str) -> list[ParsedDrug]:
        results: list[ParsedDrug] = []
        for match in DRUG_LINE_PATTERN.finditer(raw_text):
            name = match.group("name")
            if not name or len(name) < 2:
                continue
            timing_raw = match.group("timing") or ""
            results.append(
                ParsedDrug(
                    name=name.strip(),
                    dosage=match.group("dosage") or "",
                    frequency=match.group("freq") or "",
                    timing=TIMING_MAP.get(timing_raw, "after_meal"),
                )
            )
        return results

    async def parse_with_llm(self, raw_text: str) -> list[ParsedDrug]:
        response = await self._client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Extract drug information from Korean prescription text. "
                        "Return JSON: {\"drugs\": [{\"name\": str, \"dosage\": str, "
                        "\"frequency\": str, \"timing\": str}]}. "
                        "timing values: after_meal | before_meal | bedtime | morning | evening | empty_stomach"
                    ),
                },
                {"role": "user", "content": raw_text},
            ],
        )
        data = response.choices[0].message.content
        drugs = json.loads(data).get("drugs", [])
        return [ParsedDrug(**d) for d in drugs]

    async def parse(self, raw_text: str, confidence: float) -> list[ParsedDrug]:
        if not raw_text.strip():
            return []
        results = self.parse_rule_based(raw_text)
        if confidence < 0.75 or len(results) == 0:
            results = await self.parse_with_llm(raw_text)
        return results
