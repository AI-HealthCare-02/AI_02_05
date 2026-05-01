# 복약 패턴 리포트 & 의사 공유 기능 - 통합 가이드

## 기능 개요

ClinicalCare+ 앱에 **LLM 기반 복약 패턴 리포트** 생성 + **의사 GET 조회 공유** 기능을 추가합니다.

### 환자 기능
- 주간/월간 복약 패턴 리포트 생성 (GPT-4o-mini 분석)
- 약물별·시간대별·요일별 복약 순응도 시각화
- 연속 누락 구간 탐지 및 경고
- 의사 공유 링크 생성/관리

### 의사 기능 (GET 조회, 로그인 불필요)
- 토큰 기반 URL로 환자의 리포트 목록 열람
- 리포트 상세 (AI 분석, 약물별 순응도, 누락 패턴 등) 확인
- 만료 기간 설정 가능

---

## 파일 구조

```
medication-report-feature/
├── backend/
│   ├── app/
│   │   ├── main.py                          # 수정 (report router 등록)
│   │   ├── models/
│   │   │   ├── __init__.py                  # 수정 (MedicationReport, DoctorShareToken 임포트)
│   │   │   └── medication_report.py         # 신규 (MedicationReport, DoctorShareToken 모델)
│   │   ├── services/
│   │   │   └── report_service.py            # 신규 (데이터 수집 + LLM 분석 서비스)
│   │   └── api/routes/
│   │       └── report.py                    # 신규 (API 엔드포인트)
│   └── alembic/versions/
│       └── a3f8b2c1d4e5_add_reports.py      # 신규 (DB 마이그레이션)
│
└── frontend/
    └── src/app/
        ├── report/page.tsx                  # 신규 (환자용 리포트 페이지)
        ├── doctor-view/[token]/page.tsx      # 신규 (의사용 GET 조회 페이지)
        └── settings/page.tsx                # 수정 (리포트 메뉴 추가)
```

---

## 적용 방법

### 1단계: 백엔드 파일 복사

```bash
# 신규 파일 복사
cp backend/app/models/medication_report.py  → 프로젝트/backend/app/models/
cp backend/app/services/report_service.py   → 프로젝트/backend/app/services/
cp backend/app/api/routes/report.py         → 프로젝트/backend/app/api/routes/

# 수정된 파일 덮어쓰기
cp backend/app/models/__init__.py           → 프로젝트/backend/app/models/
cp backend/app/main.py                      → 프로젝트/backend/app/
```

### 2단계: DB 마이그레이션

```bash
# 마이그레이션 파일 복사
cp backend/alembic/versions/a3f8b2c1d4e5_add_reports.py → 프로젝트/backend/alembic/versions/

# 마이그레이션 실행
cd backend
alembic upgrade head
```

### 3단계: 프론트엔드 파일 복사

```bash
# 신규 디렉토리 + 페이지 생성
mkdir -p frontend/src/app/report
mkdir -p frontend/src/app/doctor-view/[token]

cp frontend/src/app/report/page.tsx             → 프로젝트/frontend/src/app/report/
cp frontend/src/app/doctor-view/[token]/page.tsx → 프로젝트/frontend/src/app/doctor-view/[token]/

# 수정된 파일 덮어쓰기
cp frontend/src/app/settings/page.tsx           → 프로젝트/frontend/src/app/settings/
```

### 4단계: 재시작

```bash
docker-compose down && docker-compose up -d --build
```

---

## API 엔드포인트

### 환자용 (인증 필요)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/report/generate` | 리포트 생성 (LLM 분석) |
| GET | `/api/report/list` | 내 리포트 목록 |
| GET | `/api/report/{report_id}` | 리포트 상세 |
| DELETE | `/api/report/{report_id}` | 리포트 삭제 |
| POST | `/api/report/doctor-share` | 의사 공유 링크 생성 |
| GET | `/api/report/doctor-share/list` | 의사 공유 링크 목록 |
| DELETE | `/api/report/doctor-share/{token_id}` | 공유 링크 삭제 |

### 의사용 (GET, 인증 불필요)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/report/doctor/{token}/view` | 환자 정보 + 전체 리포트 목록 |
| GET | `/api/report/doctor/{token}/report/{report_id}` | 특정 리포트 상세 |

---

## DB 스키마 (새 테이블 2개)

### medication_reports
| Column | Type | 설명 |
|--------|------|------|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | 환자 ID |
| report_type | VARCHAR(20) | weekly / monthly |
| period_start | DATE | 분석 시작일 |
| period_end | DATE | 분석 종료일 |
| compliance_rate | FLOAT | 전체 복약률 |
| total_scheduled | INT | 총 예정 횟수 |
| total_checked | INT | 총 복용 횟수 |
| streak_days | INT | 연속 복약 일수 |
| stats_json | JSONB | 약물별/시간대별/요일별 상세 |
| summary | TEXT | AI 요약 (환자용) |
| detail | TEXT | AI 상세 분석 (의사용) |
| recommendations | TEXT | AI 권고사항 |
| created_at | TIMESTAMPTZ | |

### doctor_share_tokens
| Column | Type | 설명 |
|--------|------|------|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | 환자 ID |
| token | VARCHAR(64) UNIQUE | URL 토큰 |
| doctor_name | VARCHAR(100) | 의사 이름 |
| hospital_name | VARCHAR(200) | 병원명 (선택) |
| expires_at | TIMESTAMPTZ | 만료일 |
| created_at | TIMESTAMPTZ | |

---

## LLM 분석 내용

리포트 생성 시 수집하는 데이터:
1. **전체 복약률** - 기간 내 예정 대비 실제 복용 비율
2. **약물별 순응도** - 각 약물의 개별 복약률 + 질병명
3. **시간대별 패턴** - 아침/점심/저녁/취침전 복약률
4. **요일별 누락** - 어떤 요일에 약을 자주 빼먹는지
5. **연속 누락 구간** - 2일 이상 연속 미복용 감지

이 데이터를 GPT-4o-mini에 전달하여 생성하는 콘텐츠:
- `summary`: 환자에게 보여줄 친근한 요약
- `detail`: 의사에게 전달할 객관적 분석
- `recommendations`: 복약 개선 권고사항

---

## 의사 공유 플로우

```
1. 환자: 설정 → 복약 리포트 → 의사 공유 탭
2. 환자: "의사 공유 링크 만들기" → 의사 이름/병원명/유효기간 입력
3. 환자: 생성된 링크 복사 → 의사에게 카톡/문자 전달
4. 의사: 링크 클릭 → 로그인 없이 바로 리포트 열람 (GET /api/report/doctor/{token}/view)
5. 의사: 리포트 펼치기 → 약물별 순응도, AI 분석, 누락 패턴 확인
```
