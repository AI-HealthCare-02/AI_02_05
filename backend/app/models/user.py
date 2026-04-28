import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    oauth_provider: Mapped[str] = mapped_column(String(20), nullable=False)
    oauth_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nickname: Mapped[str] = mapped_column(String(50), nullable=False)
    profile_img_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    kakao_access_token: Mapped[str | None] = mapped_column(String(512), nullable=True)
    kakao_refresh_token: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    ocr_results: Mapped[list["OCRResult"]] = relationship("OCRResult", back_populates="user", lazy="select")
