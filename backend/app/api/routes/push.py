import uuid
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user_id
from app.core.config import settings
from app.core.database import get_db
from app.services.push_service import PushService

router = APIRouter(prefix="/push", tags=["push"])


class SubscriptionRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    return {"public_key": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe")
async def subscribe(
    body: SubscriptionRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = PushService(db)
    await service.save_subscription(user_id, body.endpoint, body.p256dh, body.auth)
    return {"detail": "구독 완료"}


@router.delete("/unsubscribe")
async def unsubscribe(
    body: SubscriptionRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = PushService(db)
    await service.delete_subscription(user_id, body.endpoint)
    return {"detail": "구독 취소"}
