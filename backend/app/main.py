import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from app.api.routes import upload, ocr, schedule, drugs, auth, chat, push, share, admin
from app.middleware import RateLimitMiddleware, RequestLoggingMiddleware

from prometheus_fastapi_instrumentator import Instrumentator

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
        t = __import__('datetime').time(now.hour, now.minute)
        async with AsyncSessionLocal() as db:
            async with db.begin():
                await PushService(db).send_medication_reminders(t)

    scheduler = AsyncIOScheduler()
    scheduler.add_job(send_reminders, CronTrigger(minute="*"))
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="PillMate API", version="0.1.0", lifespan=lifespan)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://3.34.192.109",
        "https://pill-mate-six.vercel.app",
    ],
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

Instrumentator().instrument(app).expose(app)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    logging.getLogger(__name__).error(f"Unhandled error [{request.method} {request.url.path}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"code": "INTERNAL_ERROR", "message": "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요."},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
