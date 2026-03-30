import uuid
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks
from app.api.deps import get_ocr_service, get_current_user_id, get_s3_service
from app.services.ocr_service import OCRService
from app.services.s3_service import S3Service

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/prescription")
async def upload_prescription(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: uuid.UUID = Depends(get_current_user_id),
    ocr_service: OCRService = Depends(get_ocr_service),
    s3: S3Service = Depends(get_s3_service),
):
    image_url = await s3.upload(file)
    return await ocr_service.submit(user_id, image_url, background_tasks)


@router.post("/presign")
async def presign(
    filename: str,
    content_type: str,
    s3: S3Service = Depends(get_s3_service),
):
    return await s3.presign_upload(filename, content_type)
