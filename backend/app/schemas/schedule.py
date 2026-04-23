from datetime import date, datetime
from pydantic import BaseModel
from uuid import UUID


class ScheduleItemDto(BaseModel):
    id: UUID
    drug_name: str
    dosage: str | None
    scheduled_time: str
    checked: bool
    checked_at: datetime | None
    start_date: date
    end_date: date
    ocr_result_id: UUID
    prescribed_date: date
    disease_name: str | None


class CheckRequestDto(BaseModel):
    checked: bool


class CheckResponseDto(BaseModel):
    schedule_id: UUID
    checked: bool
    checked_at: datetime | None


class StatsResponseDto(BaseModel):
    compliance_rate: float
    streak_days: int
    total_checked: int
