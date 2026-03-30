import uuid
from datetime import date
from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel, HttpUrl
from app.api.deps import get_ocr_service, get_current_user_id
from app.services.ocr_service import OCRService
from app.core.exceptions import NotFoundError

router = APIRouter(prefix="/ocr", tags=["ocr"])


class SubmitFromURLRequest(BaseModel):
    image_url: HttpUrl


class ConfirmRequest(BaseModel):
    drugs: list[dict]
    start_date: date | None = None


@router.post("/submit")
async def submit_from_url(
    body: SubmitFromURLRequest,
    background_tasks: BackgroundTasks,
    user_id: uuid.UUID = Depends(get_current_user_id),
    service: OCRService = Depends(get_ocr_service),
):
    return await service.submit(user_id, str(body.image_url), background_tasks)


@router.get("/{ocr_id}/status")
async def get_status(
    ocr_id: uuid.UUID,
    service: OCRService = Depends(get_ocr_service),
):
    ocr = await service.ocr_repo.get_by_id(ocr_id)
    if not ocr:
        raise NotFoundError("OCRResult", str(ocr_id))
    return {
        "ocr_id": str(ocr_id),
        "status": ocr.status,
        "confidence": ocr.confidence,
        "parsed_drugs": ocr.parsed_drugs,
    }


@router.post("/{ocr_id}/confirm")
async def confirm(
    ocr_id: uuid.UUID,
    body: ConfirmRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    service: OCRService = Depends(get_ocr_service),
):
    return await service.confirm_and_generate_schedule(
        ocr_id=ocr_id,
        user_id=user_id,
        drugs=body.drugs,
        start_date=body.start_date,
    )
