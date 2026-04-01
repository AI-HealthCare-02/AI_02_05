import logging
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from app.api.routes import upload, ocr, schedule, drugs, auth, chat

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="PillMate API", version="0.1.0")

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


@app.get("/health")
async def health():
    return {"status": "ok"}
