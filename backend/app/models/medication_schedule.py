import uuid
from datetime import date, time, datetime
from sqlalchemy import ForeignKey, Time, Date, DateTime, String, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class MedicationSchedule(Base):
    __tablename__ = "medication_schedules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    ocr_result_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ocr_results.id", ondelete="CASCADE"))
    drug_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    scheduled_time: Mapped[time] = mapped_column(Time, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    checks: Mapped[list["ScheduleCheck"]] = relationship("ScheduleCheck", back_populates="schedule")


class ScheduleCheck(Base):
    __tablename__ = "schedule_checks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    schedule_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medication_schedules.id", ondelete="CASCADE"))
    check_date: Mapped[date] = mapped_column(Date, nullable=False)
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    schedule: Mapped["MedicationSchedule"] = relationship("MedicationSchedule", back_populates="checks")
