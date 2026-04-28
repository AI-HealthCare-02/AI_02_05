import uuid
from datetime import datetime, date
from sqlalchemy import String, Text, Date, DateTime, ForeignKey, Float, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class MedicationReport(Base):
    """LLM이 생성한 복약 패턴 리포트"""
    __tablename__ = "medication_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    report_type: Mapped[str] = mapped_column(String(20), nullable=False, default="weekly")  # weekly / monthly
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)

    # 통계 스냅샷
    compliance_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_scheduled: Mapped[int] = mapped_column(default=0)
    total_checked: Mapped[int] = mapped_column(default=0)
    streak_days: Mapped[int] = mapped_column(default=0)
    stats_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # 약물별·시간대별 상세

    # LLM 생성 콘텐츠
    summary: Mapped[str] = mapped_column(Text, nullable=False)  # 요약 (환자용)
    detail: Mapped[str] = mapped_column(Text, nullable=False)   # 상세 분석 (의사용)
    recommendations: Mapped[str | None] = mapped_column(Text, nullable=True)  # 권고사항

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))


class DoctorShareToken(Base):
    """의사 전용 공유 토큰 - 리포트 열람 권한"""
    __tablename__ = "doctor_share_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    doctor_name: Mapped[str] = mapped_column(String(100), nullable=False, default="담당 의사")
    hospital_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
