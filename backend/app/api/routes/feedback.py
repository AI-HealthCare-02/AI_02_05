from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
import uuid

router = APIRouter(prefix="/feedback", tags=["feedback"])

class FeedbackRequest(BaseModel):
    content: str
    page: str = "general"

@router.post("/")
async def create_feedback(
    body: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        text("""
            INSERT INTO feedbacks (id, content, page, created_at)
            VALUES (:id, :content, :page, :created_at)
        """),
        {
            "id": str(uuid.uuid4()),
            "content": body.content,
            "page": body.page,
            "created_at": datetime.now(timezone.utc),
        }
    )
    await db.commit()
    return {"detail": "감사합니다. 소중한 의견이 반영될게요."}
