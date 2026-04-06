import uuid
import httpx
import base64
import aioboto3
from datetime import date
from pathlib import Path
from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.ocr_repository import OCRRepository
from app.repositories.drug_repository import DrugRepository
from app.services.ocr_parser import OCRParser
from app.services.schedule_service import ScheduleService, ScheduleCreateInput
from app.core.exceptions import NotFoundError, OCRProcessingError
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


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
            except Exception as e:
                logger.error(f"OCR 처리 실패: {e}", exc_info=True)
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
        disease_name: str | None = None,
    ) -> dict:
        ocr = await self.ocr_repo.get_by_id(ocr_id)
        if not ocr:
            raise NotFoundError("OCRResult", str(ocr_id))
        if disease_name:
            ocr.disease_name = disease_name
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

    async def _image_to_base64(self, image_url: str) -> tuple[str, str]:
        """이미지를 Base64로 변환 (로컬/S3 모두 처리)"""
        if "localhost" in image_url:
            # 로컬 파일
            filename = image_url.split("/uploads/")[-1]
            file_path = Path("uploads") / filename
            logger.info(f"로컬 파일 읽기: {file_path}")
            if not file_path.exists():
                raise OCRProcessingError(f"파일 없음: {file_path}")
            with open(file_path, "rb") as f:
                data = f.read()
            ext = filename.rsplit(".", 1)[-1].lower()
        else:
            # S3에서 직접 다운로드
            key = image_url.split(".amazonaws.com/")[-1]
            ext = key.rsplit(".", 1)[-1].lower()
            logger.info(f"S3에서 이미지 다운로드: {key}")
            session = aioboto3.Session(
                aws_access_key_id=settings.AWS_ACCESS_KEY,
                aws_secret_access_key=settings.AWS_SECRET_KEY,
                region_name=settings.AWS_REGION,
            )
            async with session.client("s3") as s3:
                response = await s3.get_object(Bucket=settings.S3_BUCKET, Key=key)
                data = await response["Body"].read()
            logger.info(f"S3 다운로드 완료: {len(data)} bytes")

        fmt = "jpg" if ext in ("jpg", "jpeg") else ext
        return base64.b64encode(data).decode("utf-8"), fmt

    async def _call_clova(self, image_url: str) -> tuple[str, float]:
        image_data, fmt = await self._image_to_base64(image_url)

        payload = {
            "version": "V2",
            "requestId": str(uuid.uuid4()),
            "timestamp": 0,
            "images": [{"format": fmt, "name": "prescription", "data": image_data}],
        }

        logger.info(f"Clova OCR 호출 (Base64 방식)")
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                settings.CLOVA_OCR_URL,
                headers={"X-OCR-SECRET": settings.CLOVA_OCR_SECRET},
                json=payload,
            )

        logger.info(f"Clova 응답 status: {resp.status_code}")
        if resp.status_code != 200:
            raise OCRProcessingError(f"Clova OCR {resp.status_code}: {resp.text[:200]}")

        fields = resp.json()["images"][0].get("fields", [])
        logger.info(f"Clova fields: {len(fields)}개")
        if not fields:
            raise OCRProcessingError("OCR 인식 결과 없음")

        raw = " ".join(f["inferText"] for f in fields)
        conf = sum(f["inferConfidence"] for f in fields) / len(fields)
        logger.info(f"raw_text: {raw[:200]}")
        return raw, round(conf, 4)
