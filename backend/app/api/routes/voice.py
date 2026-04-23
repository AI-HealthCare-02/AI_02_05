from fastapi import APIRouter, UploadFile, File, Depends
from openai import AsyncOpenAI
from app.core.config import settings
from app.api.deps import get_current_user_id
import uuid

router = APIRouter(prefix="/voice", tags=["voice"])

@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    audio_bytes = await file.read()
    transcript = await client.audio.transcriptions.create(
        model="whisper-1",
        file=(file.filename or "audio.webm", audio_bytes, file.content_type or "audio/webm"),
        language="ko",
    )
    return {"text": transcript.text}
