import uuid
import secrets
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.medication_report import MedicationReport, DoctorShareToken
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter(prefix="/report", tags=["report"])


# ──────────────────────────── Schemas ────────────────────────────

class GenerateReportRequest(BaseModel):
    report_type: str = "weekly"  # weekly | monthly
    start_date: date | None = None
    end_date: date | None = None


class CreateDoctorShareRequest(BaseModel):
    doctor_name: str = "담당 의사"
    hospital_name: str | None = None
    report_ids: list[str] = []  # 공유할 리포트 IDs (빈 배열이면 전체)
    expires_days: int | None = 7


# ──────────────────────── 리포트 생성/조회 ────────────────────────

@router.post("/generate")
async def generate_report(
    body: GenerateReportRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """복약 패턴 리포트 생성 (LLM 분석)"""
    service = ReportService(db)
    report = await service.generate_report(
        user_id=user_id,
        report_type=body.report_type,
        start_date=body.start_date,
        end_date=body.end_date,
    )
    return {
        "id": str(report.id),
        "report_type": report.report_type,
        "period_start": report.period_start.isoformat(),
        "period_end": report.period_end.isoformat(),
        "compliance_rate": report.compliance_rate,
        "total_scheduled": report.total_scheduled,
        "total_checked": report.total_checked,
        "streak_days": report.streak_days,
        "summary": report.summary,
        "detail": report.detail,
        "recommendations": report.recommendations,
        "stats_json": report.stats_json,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }


@router.get("/list")
async def list_reports(
    limit: int = Query(default=10, le=50),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """내 리포트 목록"""
    service = ReportService(db)
    return await service.list_reports(user_id, limit)


@router.get("/{report_id}")
async def get_report(
    report_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """리포트 상세 조회"""
    service = ReportService(db)
    data = await service.get_report_for_doctor(report_id, user_id)
    if not data:
        raise HTTPException(status_code=404, detail="리포트를 찾을 수 없습니다.")
    return data


@router.delete("/{report_id}")
async def delete_report(
    report_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(MedicationReport).where(
            MedicationReport.id == report_id,
            MedicationReport.user_id == user_id,
        )
    )
    await db.commit()
    return {"detail": "삭제되었습니다."}


# ──────────────────────── 의사 공유 토큰 ────────────────────────

@router.post("/doctor-share")
async def create_doctor_share(
    body: CreateDoctorShareRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """의사 공유 링크 생성"""
    expires_at = None
    if body.expires_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=body.expires_days)

    token = DoctorShareToken(
        user_id=user_id,
        token=secrets.token_urlsafe(32),
        doctor_name=body.doctor_name,
        hospital_name=body.hospital_name,
        expires_at=expires_at,
    )
    db.add(token)
    await db.flush()
    await db.commit()

    return {
        "id": str(token.id),
        "token": token.token,
        "doctor_name": token.doctor_name,
        "hospital_name": token.hospital_name,
        "expires_at": expires_at.isoformat() if expires_at else None,
    }


@router.get("/doctor-share/list")
async def list_doctor_shares(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """내 의사 공유 링크 목록"""
    result = await db.execute(
        select(DoctorShareToken)
        .where(DoctorShareToken.user_id == user_id)
        .order_by(DoctorShareToken.created_at.desc())
    )
    tokens = result.scalars().all()
    now = datetime.now(timezone.utc)
    return [
        {
            "id": str(t.id),
            "token": t.token,
            "doctor_name": t.doctor_name,
            "hospital_name": t.hospital_name,
            "expires_at": t.expires_at.isoformat() if t.expires_at else None,
            "expired": t.expires_at is not None and t.expires_at < now,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in tokens
    ]


@router.delete("/doctor-share/{token_id}")
async def delete_doctor_share(
    token_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(DoctorShareToken).where(
            DoctorShareToken.id == token_id,
            DoctorShareToken.user_id == user_id,
        )
    )
    await db.commit()
    return {"detail": "삭제되었습니다."}


# ──────────────────── 의사 GET 조회 (인증 없이) ────────────────────

@router.get("/doctor/{token}/view")
async def doctor_view(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """의사가 토큰으로 열람 - 환자 정보 + 전체 리포트 목록"""
    result = await db.execute(
        select(DoctorShareToken).where(DoctorShareToken.token == token)
    )
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="유효하지 않은 링크입니다.")

    now = datetime.now(timezone.utc)
    if share.expires_at and share.expires_at < now:
        raise HTTPException(status_code=410, detail="만료된 링크입니다.")

    # 환자 정보
    user_result = await db.execute(select(User).where(User.id == share.user_id))
    user = user_result.scalar_one_or_none()

    # 리포트 목록 (최근 20개)
    reports_result = await db.execute(
        select(MedicationReport)
        .where(MedicationReport.user_id == share.user_id)
        .order_by(MedicationReport.created_at.desc())
        .limit(20)
    )
    reports = reports_result.scalars().all()

    return {
        "patient": {
            "nickname": user.nickname if user else "환자",
            "profile_img_url": user.profile_img_url if user else None,
        },
        "doctor_name": share.doctor_name,
        "hospital_name": share.hospital_name,
        "reports": [
            {
                "id": str(r.id),
                "report_type": r.report_type,
                "period_start": r.period_start.isoformat(),
                "period_end": r.period_end.isoformat(),
                "compliance_rate": r.compliance_rate,
                "total_scheduled": r.total_scheduled,
                "total_checked": r.total_checked,
                "streak_days": r.streak_days,
                "stats_json": r.stats_json,
                "summary": r.summary,
                "detail": r.detail,
                "recommendations": r.recommendations,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reports
        ],
    }


@router.get("/doctor/{token}/report/{report_id}")
async def doctor_view_report(
    token: str,
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """의사가 특정 리포트 상세 조회"""
    result = await db.execute(
        select(DoctorShareToken).where(DoctorShareToken.token == token)
    )
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="유효하지 않은 링크입니다.")
    now = datetime.now(timezone.utc)
    if share.expires_at and share.expires_at < now:
        raise HTTPException(status_code=410, detail="만료된 링크입니다.")

    service = ReportService(db)
    data = await service.get_report_for_doctor(report_id, share.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="리포트를 찾을 수 없습니다.")

    user_result = await db.execute(select(User).where(User.id == share.user_id))
    user = user_result.scalar_one_or_none()

    return {
        "patient": {
            "nickname": user.nickname if user else "환자",
            "profile_img_url": user.profile_img_url if user else None,
        },
        "doctor_name": share.doctor_name,
        "hospital_name": share.hospital_name,
        "report": data,
    }
