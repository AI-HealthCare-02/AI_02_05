import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ocr_result import OCRResult


class OCRRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, ocr_id: uuid.UUID) -> OCRResult | None:
        result = await self.db.execute(
            select(OCRResult).where(OCRResult.id == ocr_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user(self, user_id: uuid.UUID, limit: int = 10, offset: int = 0) -> list[OCRResult]:
        result = await self.db.execute(
            select(OCRResult)
            .where(OCRResult.user_id == user_id)
            .order_by(OCRResult.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def create(self, user_id: uuid.UUID, image_url: str) -> OCRResult:
        ocr = OCRResult(user_id=user_id, image_url=image_url, status="pending")
        self.db.add(ocr)
        await self.db.flush()
        await self.db.refresh(ocr)
        return ocr

    async def update_result(
        self,
        ocr_id: uuid.UUID,
        *,
        status: str,
        raw_text: str | None = None,
        parsed_drugs: list[dict] | None = None,
        confidence: float | None = None,
    ) -> OCRResult | None:
        ocr = await self.get_by_id(ocr_id)
        if not ocr:
            return None
        ocr.status = status
        if raw_text is not None:
            ocr.raw_text = raw_text
        if parsed_drugs is not None:
            ocr.parsed_drugs = parsed_drugs
        if confidence is not None:
            ocr.confidence = confidence
        await self.db.flush()
        return ocr
