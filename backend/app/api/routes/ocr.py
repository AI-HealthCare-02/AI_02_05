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
    disease_name: str | None = None


@router.get("/list")
async def list_ocr(
    user_id: uuid.UUID = Depends(get_current_user_id),
    service: OCRService = Depends(get_ocr_service),
):
    results = await service.ocr_repo.get_by_user(user_id, limit=20)
    return [
        {
            "id": str(r.id),
            "image_url": r.image_url,
            "status": r.status,
            "prescribed_date": r.prescribed_date.isoformat() if r.prescribed_date else None,
            "parsed_drugs": r.parsed_drugs,
            "created_at": r.created_at.isoformat(),
        }
        for r in results if r.status == "done"
    ]


@router.delete("/{ocr_id}")
async def delete_ocr(
    ocr_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    service: OCRService = Depends(get_ocr_service),
):
    from sqlalchemy import delete as sql_delete
    from app.models.medication_schedule import MedicationSchedule
    ocr = await service.ocr_repo.get_by_id(ocr_id)
    if not ocr or ocr.user_id != user_id:
        raise NotFoundError("OCRResult", str(ocr_id))
    await service.db.delete(ocr)
    await service.db.flush()
    await service.db.commit()
    return {"detail": "삭제되었습니다."}


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
        disease_name=body.disease_name,
    )
