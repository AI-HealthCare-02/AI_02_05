import uuid
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.api.deps import get_schedule_service, get_current_user_id
from app.services.schedule_service import ScheduleService
from app.schemas.schedule import CheckRequestDto, StatsResponseDto

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.get("/monthly")
async def get_monthly(
    year: int = Query(...),
    month: int = Query(...),
    user_id: uuid.UUID = Depends(get_current_user_id),
    service: ScheduleService = Depends(get_schedule_service),
):
    return await service.get_monthly_status(user_id, year, month)


@router.get("/stats", response_model=StatsResponseDto)
async def get_stats(
    start: date = Query(...),
    end: date = Query(...),
    user_id: uuid.UUID = Depends(get_current_user_id),
    service: ScheduleService = Depends(get_schedule_service),
):
    if start > end:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"code": "VALIDATION_ERROR", "message": "시작일이 종료일보다 늦을 수 없어요."})
    return await service.get_compliance(user_id, start, end)


@router.get("/")
async def get_schedule(
    target_date: date = Query(..., alias="date"),
    user_id: uuid.UUID = Depends(get_current_user_id),
    service: ScheduleService = Depends(get_schedule_service),
):
    return await service.get_for_date(user_id, target_date)


@router.patch("/{schedule_id}/check")
async def check_schedule(
    schedule_id: uuid.UUID,
    body: CheckRequestDto,
    user_id: uuid.UUID = Depends(get_current_user_id),
    service: ScheduleService = Depends(get_schedule_service),
):
    return await service.check(schedule_id, user_id, body.checked)


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    service: ScheduleService = Depends(get_schedule_service),
):
    return await service.delete(schedule_id, user_id)
