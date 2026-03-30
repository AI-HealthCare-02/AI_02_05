import uuid
import httpx
from datetime import date
from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.ocr_repository import OCRRepository
from app.repositories.drug_repository import DrugRepository
from app.services.ocr_parser import OCRParser
from app.services.schedule_service import ScheduleService, ScheduleCreateInput
from app.core.exceptions import NotFoundError, OCRProcessingError
from app.core.config import settings
from app.models.ocr_result import OCRResult


class OCRService:
    def __init__(self, db: AsyncSession):
        self.ocr_repo = OCRRepository(db)
        self.drug_repo = DrugRepository(db)
        self.schedule_svc = ScheduleService(db)
        self.parser = OCRParser()
        self.db = db

    async def submit(self, user_id: uuid.UUID, image_url: str, background_tasks: BackgroundTasks) -> dict:
        ocr = await self.ocr_repo.create(user_id=user_id, image_url=image_url)
        await self.db.commit()
        background_tasks.add_task(self._process, ocr.id)
        return {"ocr_id": str(ocr.id), "status": "pending"}

    async def _process(self, ocr_id: uuid.UUID) -> None:
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            svc = OCRService(session)
            try:
                await svc._run(ocr_id)
                await session.commit()
            except Exception:
                await session.rollback()
                await svc.ocr_repo.update_result(ocr_id, status="failed")
                await session.commit()

    async def _run(self, ocr_id: uuid.UUID) -> None:
        ocr = await self.ocr_repo.get_by_id(ocr_id)
        if not ocr:
            return
        raw_text, confidence = await self._call_clova(ocr.image_url)
        parsed = await self.parser.parse(raw_text, confidence)
        matched = await self.drug_repo.bulk_get_by_names([d.name for d in parsed])
        matched_names = {d.name_ko for d in matched}
        for d in parsed:
            d.verified = d.name in matched_names
        serialized = [
            {"name": d.name, "dosage": d.dosage, "frequency": d.frequency,
             "timing": d.timing, "verified": d.verified}
            for d in parsed
        ]
        await self.ocr_repo.update_result(
            ocr_id, status="done", raw_text=raw_text,
            parsed_drugs=serialized, confidence=confidence,
        )

    async def confirm_and_generate_schedule(
        self, ocr_id: uuid.UUID, user_id: uuid.UUID,
        drugs: list[dict], start_date: date | None = None,
    ) -> dict:
        ocr = await self.ocr_repo.get_by_id(ocr_id)
        if not ocr:
            raise NotFoundError("OCRResult", str(ocr_id))
        await self.ocr_repo.update_result(ocr_id, status="confirmed", parsed_drugs=drugs)
        inputs = [
            ScheduleCreateInput(
                user_id=user_id,
                ocr_result_id=ocr_id,
                drug_name=d["name"],
                dosage=d.get("dosage", ""),
                frequency=d.get("frequency", "1일 1회"),
                timing=d.get("timing", "after_meal"),
                start_date=start_date or date.today(),
            )
            for d in drugs
        ]
        schedules = await self.schedule_svc.create_from_ocr(inputs)
        await self.db.commit()
        return {"ocr_id": str(ocr_id), "schedules_created": len(schedules)}

    async def _call_clova(self, image_url: str) -> tuple[str, float]:
        payload = {
            "version": "V2",
            "requestId": str(uuid.uuid4()),
            "timestamp": 0,
            "images": [{"format": "jpg", "name": "rx", "url": image_url}],
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                settings.CLOVA_OCR_URL,
                headers={"X-OCR-SECRET": settings.CLOVA_OCR_SECRET},
                json=payload,
            )
        if resp.status_code != 200:
            raise OCRProcessingError(f"Clova OCR {resp.status_code}")
        fields = resp.json()["images"][0].get("fields", [])
        if not fields:
            raise OCRProcessingError("Empty OCR result")
        raw = " ".join(f["inferText"] for f in fields)
        conf = sum(f["inferConfidence"] for f in fields) / len(fields)
        return raw, round(conf, 4)
