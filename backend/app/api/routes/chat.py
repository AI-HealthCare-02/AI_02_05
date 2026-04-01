import uuid
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.api.deps import get_current_user_id
from app.services.chat_service import ChatService
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


@router.post("/stream")
async def chat_stream(
    body: ChatRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ChatService(db)
    return StreamingResponse(
        service.stream(user_id=user_id, message=body.message, session_id=body.session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
