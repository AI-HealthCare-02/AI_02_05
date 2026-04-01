import uuid
import aioboto3
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


class S3Service:
    def _session(self):
        return aioboto3.Session(
            aws_access_key_id=settings.AWS_ACCESS_KEY,
            aws_secret_access_key=settings.AWS_SECRET_KEY,
            region_name=settings.AWS_REGION,
        )

    async def upload(self, file: UploadFile) -> str:
        await self._validate(file)
        ext = (file.filename or "upload").rsplit(".", 1)[-1].lower()
        key = f"prescriptions/{uuid.uuid4()}.{ext}"
        try:
            async with self._session().client("s3") as s3:
                await s3.upload_fileobj(
                    file.file,
                    settings.S3_BUCKET,
                    key,
                    ExtraArgs={
                        "ContentType": file.content_type,
                        "ServerSideEncryption": "AES256",
                    },
                )
        except ClientError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"S3 업로드 실패: {e.response['Error']['Code']}",
            )
        return f"https://{settings.S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"

    async def presign_upload(self, filename: str, content_type: str) -> dict:
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"지원하지 않는 파일 형식: {content_type}",
            )
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
        key = f"prescriptions/{uuid.uuid4()}.{ext}"
        try:
            async with self._session().client("s3") as s3:
                presigned = await s3.generate_presigned_post(
                    Bucket=settings.S3_BUCKET,
                    Key=key,
                    Fields={"Content-Type": content_type},
                    Conditions=[
                        {"Content-Type": content_type},
                        ["content-length-range", 1, MAX_FILE_SIZE],
                    ],
                    ExpiresIn=settings.S3_PRESIGNED_EXPIRY,
                )
        except ClientError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Presign 실패: {e.response['Error']['Code']}",
            )
        return {
            "upload_url": presigned["url"],
            "fields": presigned["fields"],
            "object_url": f"https://{settings.S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}",
            "expires_in": settings.S3_PRESIGNED_EXPIRY,
        }

    async def _validate(self, file: UploadFile) -> None:
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"지원하지 않는 파일 형식: {file.content_type}",
            )
        chunk = await file.read(MAX_FILE_SIZE + 1)
        if len(chunk) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="파일 크기가 10MB를 초과했습니다",
            )
        await file.seek(0)
