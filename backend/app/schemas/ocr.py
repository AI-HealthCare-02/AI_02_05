from datetime import date, datetime
from pydantic import BaseModel
from uuid import UUID


class ParsedDrugDto(BaseModel):
    name: str
    dosage: str = ""
    frequency: str = "1일 1회"
    timing: str = "after_meal"
    custom_time: str | None = None
    verified: bool = False


class OCRStatusResponseDto(BaseModel):
    ocr_id: UUID
    status: str
    confidence: float | None
    parsed_drugs: list[ParsedDrugDto] | None


class OCRConfirmRequestDto(BaseModel):
    drugs: list[dict]
    start_date: date | None = None
    disease_name: str | None = None


class OCRConfirmResponseDto(BaseModel):
    ocr_id: UUID
    schedules_created: int


class OCRListItemDto(BaseModel):
    id: UUID
    image_url: str
    status: str
    prescribed_date: date | None
    parsed_drugs: list | None
    created_at: datetime
