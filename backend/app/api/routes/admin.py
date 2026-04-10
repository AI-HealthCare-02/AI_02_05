import uuid
from datetime import date, timedelta, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.core.database import get_db
from app.models.user import User
from app.models.ocr_result import OCRResult
from app.models.medication_schedule import MedicationSchedule, ScheduleCheck

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # 총 유저 수
    total_users = await db.scalar(select(func.count()).select_from(User))

    # 오늘 신규 유저
    new_users_today = await db.scalar(
        select(func.count()).select_from(User)
        .where(func.date(User.created_at) == today)
    )

    # 이번 주 신규 유저
    new_users_week = await db.scalar(
        select(func.count()).select_from(User)
        .where(func.date(User.created_at) >= week_ago)
    )

    # 총 처방전 수
    total_prescriptions = await db.scalar(
        select(func.count()).select_from(OCRResult)
        .where(OCRResult.status == "done")
    )

    # 오늘 등록된 처방전
    prescriptions_today = await db.scalar(
        select(func.count()).select_from(OCRResult)
        .where(
            OCRResult.status == "done",
            func.date(OCRResult.created_at) == today,
        )
    )

    # 총 복약 체크 수
    total_checks = await db.scalar(
        select(func.count()).select_from(ScheduleCheck)
        .where(ScheduleCheck.checked_at.isnot(None))
    )

    # 오늘 복약 체크 수
    checks_today = await db.scalar(
        select(func.count()).select_from(ScheduleCheck)
        .where(
            ScheduleCheck.check_date == today,
            ScheduleCheck.checked_at.isnot(None),
        )
    )

    # 이번 주 복약 체크 수
    checks_week = await db.scalar(
        select(func.count()).select_from(ScheduleCheck)
        .where(
            ScheduleCheck.check_date >= week_ago,
            ScheduleCheck.checked_at.isnot(None),
        )
    )

    # 활성 스케줄 수 (오늘 기준)
    active_schedules = await db.scalar(
        select(func.count()).select_from(MedicationSchedule)
        .where(
            MedicationSchedule.active.is_(True),
            MedicationSchedule.start_date <= today,
            MedicationSchedule.end_date >= today,
        )
    )

    # 일별 체크 수 (최근 7일)
    daily_checks = await db.execute(
        select(
            ScheduleCheck.check_date,
            func.count().label("count")
        )
        .where(
            ScheduleCheck.check_date >= week_ago,
            ScheduleCheck.checked_at.isnot(None),
        )
        .group_by(ScheduleCheck.check_date)
        .order_by(ScheduleCheck.check_date)
    )
    daily_data = [{"date": str(r.check_date), "count": r.count} for r in daily_checks.all()]

    return {
        "users": {
            "total": total_users,
            "new_today": new_users_today,
            "new_this_week": new_users_week,
        },
        "prescriptions": {
            "total": total_prescriptions,
            "today": prescriptions_today,
        },
        "checks": {
            "total": total_checks,
            "today": checks_today,
            "this_week": checks_week,
        },
        "active_schedules": active_schedules,
        "daily_checks": daily_data,
    }


@router.get("/users")
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "nickname": u.nickname,
            "profile_img_url": u.profile_img_url,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.patch("/users/{user_id}/block")
async def block_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "유저를 찾을 수 없어요."})
    user.is_active = not user.is_active
    await db.commit()
    return {"id": str(user.id), "is_active": user.is_active}


@router.delete("/users/{user_id}")
async def delete_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "유저를 찾을 수 없어요."})
    user.deleted_at = datetime.now(timezone.utc)
    user.is_active = False
    await db.commit()
    return {"detail": "삭제되었어요."}
