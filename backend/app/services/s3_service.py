import uuid
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException, status

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


class S3Service:
    async def upload(self, file: UploadFile) -> str:
        await self._validate(file)
        ext = (file.filename or "upload").rsplit(".", 1)[-1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        dest = UPLOAD_DIR / filename
        with dest.open("wb") as f:
            shutil.copyfileobj(file.file, f)
        return f"http://localhost:8000/uploads/{filename}"

    async def presign_upload(self, filename: str, content_type: str) -> dict:
        return {"upload_url": "", "fields": {}, "object_url": "", "expires_in": 300}

    async def _validate(self, file: UploadFile) -> None:
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file type: {file.content_type}",
            )
        chunk = await file.read(MAX_FILE_SIZE + 1)
        if len(chunk) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File too large",
            )
        await file.seek(0)

    def _public_url(self, key: str) -> str:
        return f"http://localhost:8000/uploads/{key}"
