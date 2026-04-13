import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.routes import upload, ocr, schedule, drugs, auth, chat, push, share, admin, notifications

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    from app.core.database import AsyncSessionLocal
    from app.services.push_service import PushService
    from datetime import datetime

    async def send_reminders():
        from zoneinfo import ZoneInfo
        now = datetime.now(ZoneInfo("Asia/Seoul"))
        t = __import__("datetime").time(now.hour, now.minute)
        async with AsyncSessionLocal() as db:
            async with db.begin():
                await PushService(db).send_medication_reminders(t)

    scheduler = AsyncIOScheduler()
    scheduler.add_job(send_reminders, CronTrigger(minute="*"))
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="PillMate API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path("uploads").mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(ocr.router)
app.include_router(schedule.router)
app.include_router(drugs.router)
app.include_router(chat.router)
app.include_router(push.router)
app.include_router(share.router)
app.include_router(admin.router)
app.include_router(notifications.router)

Instrumentator().instrument(app).expose(app)


@app.get("/health")
async def health():
    return {"status": "ok"}