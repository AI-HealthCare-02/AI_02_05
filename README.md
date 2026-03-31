# 💊 ClinicalCare+ — 처방전 기반 복약 관리 서비스

> 처방전 촬영 → OCR 자동 인식 → 복약 스케줄 생성 → AI 챗봇 상담까지, 원스톱 복약 관리

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 프로젝트 소개

**ClinicalCare+** 는 처방전 사진 한 장으로 복약 관리를 시작할 수 있는 모바일 웹서비스입니다.

Clova OCR로 처방전을 자동 인식하고, 약물 정보 확인 → 복약 스케줄 자동 생성 → 복약 체크 → 약물 상호작용 경고 → AI 챗봇 건강 상담까지 한 곳에서 제공합니다.

### 핵심 기능

| 기능 | 설명 |
|------|------|
| 📸 **처방전 OCR** | 처방전 사진 업로드 → Clova OCR로 약물명/용량/복용법 자동 인식 |
| 📅 **복약 스케줄** | 인식된 약물 기반 복약 시간표 자동 생성 + 날짜별 체크 |
| 📊 **복약 통계** | 복약 순응도(compliance rate), 연속 복약일, 총 체크 수 추적 |
| 💊 **약물 상호작용** | 복용 약물 간 상호작용 심각도별 경고 |
| 💬 **AI 챗봇** | OpenAI 기반 스트리밍 건강 상담 (SSE) |
| 🔐 **카카오 로그인** | OAuth2 카카오 소셜 로그인 + JWT 인증 |

---

## 🏗️ 시스템 아키텍처

```
사용자 (모바일 웹)
      ↓
Next.js 16 Frontend (React 19 + TypeScript + Tailwind CSS 4)
      ↓  Axios + React Query
FastAPI Backend (REST API)
  ├─ /auth/kakao          → 카카오 OAuth 로그인 + JWT 발급
  ├─ /upload/prescription  → S3 업로드 + OCR 요청
  ├─ /ocr/*               → Clova OCR 처리 + 약물 파싱
  ├─ /schedule/*          → 복약 스케줄 CRUD + 체크
  ├─ /drugs/*             → 약물 검색 + 상호작용 체크
  └─ /chat/stream         → AI 챗봇 (SSE 스트리밍)
      ↓
PostgreSQL 16 + Redis 7
  ├─ users, ocr_results, medication_schedules, schedule_checks
  └─ drugs, drug_interactions
      ↓
외부 서비스
  ├─ Naver Clova OCR (처방전 텍스트 인식)
  ├─ AWS S3 (처방전 이미지 저장)
  └─ OpenAI API (AI 챗봇)
```

---

## 📁 프로젝트 구조

```
clinicalcare/
├── README.md
├── docker-compose.yml
├── LICENSE
│
├── backend/                          # FastAPI + Python
│   ├── alembic/                      # DB 마이그레이션
│   │   └── versions/
│   ├── app/
│   │   ├── main.py                   # FastAPI 엔트리포인트
│   │   ├── core/
│   │   │   ├── config.py             # 환경변수 (Pydantic Settings)
│   │   │   ├── database.py           # AsyncSession 설정
│   │   │   └── exceptions.py         # 커스텀 예외
│   │   ├── models/                   # SQLAlchemy ORM
│   │   │   ├── user.py               # 사용자 (OAuth)
│   │   │   ├── drug.py               # 약물 + 상호작용
│   │   │   ├── ocr_result.py         # OCR 결과 (JSONB)
│   │   │   └── medication_schedule.py # 복약 스케줄 + 체크
│   │   ├── repositories/             # DB 접근 계층
│   │   ├── services/                 # 비즈니스 로직
│   │   │   ├── auth_service.py       # 카카오 로그인 + JWT
│   │   │   ├── ocr_service.py        # OCR 처리 파이프라인
│   │   │   ├── ocr_parser.py         # OCR 텍스트 → 약물 파싱
│   │   │   ├── schedule_service.py   # 복약 스케줄 관리
│   │   │   ├── drug_service.py       # 약물 검색/상호작용
│   │   │   ├── chat_service.py       # AI 챗봇 (SSE)
│   │   │   └── s3_service.py         # S3 업로드/Presigned URL
│   │   └── api/
│   │       ├── deps.py               # 의존성 주입
│   │       └── routes/               # API 라우터 (6개)
│   └── alembic.ini
│
└── frontend/                         # Next.js 16 + TypeScript
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx            # 루트 레이아웃 (모바일 max-w-md)
    │   │   ├── page.tsx              # 홈
    │   │   ├── login/page.tsx        # 카카오 로그인
    │   │   ├── auth/callback/kakao/  # OAuth 콜백
    │   │   ├── upload/page.tsx       # 처방전 업로드
    │   │   ├── ocr/[id]/page.tsx     # OCR 결과 확인/수정
    │   │   ├── schedule/page.tsx     # 복약 스케줄
    │   │   └── chat/page.tsx         # AI 챗봇
    │   ├── components/
    │   │   └── BottomNav.tsx         # 하단 네비게이션
    │   ├── hooks/                    # useOCR, useSchedule
    │   ├── lib/api.ts                # Axios 인스턴스
    │   └── types/index.ts            # TypeScript 타입 정의
    └── package.json
```

---

## 🛠️ 기술 스택

| 레이어 | 기술 | 버전 |
|--------|------|------|
| **Frontend** | Next.js + React + TypeScript | 16 / 19 |
| **스타일링** | Tailwind CSS | 4 |
| **상태관리** | TanStack React Query | 5 |
| **HTTP** | Axios | 1.14 |
| **Backend** | FastAPI (Python) | 0.100+ |
| **ORM** | SQLAlchemy (Async) | 2.0 |
| **DB** | PostgreSQL | 16 |
| **Cache** | Redis | 7 |
| **OCR** | Naver Clova OCR | - |
| **AI 챗봇** | OpenAI API | - |
| **스토리지** | AWS S3 (Presigned URL) | - |
| **인증** | 카카오 OAuth2 + JWT | - |
| **배포** | Docker Compose | - |

---

## 🗄️ ERD (주요 테이블)

```
users
  ├── id (UUID, PK)
  ├── oauth_provider, oauth_id
  ├── email, nickname, profile_img_url
  └── is_active, created_at

ocr_results
  ├── id (UUID, PK)
  ├── user_id (FK → users)
  ├── image_url, raw_text
  ├── status (pending → processing → done/failed)
  ├── confidence, parsed_drugs (JSONB)
  └── prescribed_date

medication_schedules
  ├── id (UUID, PK)
  ├── user_id (FK → users)
  ├── ocr_result_id (FK → ocr_results)
  ├── drug_name, dosage, scheduled_time
  └── start_date, end_date, active

schedule_checks
  ├── id (UUID, PK)
  ├── schedule_id (FK → medication_schedules)
  └── check_date, checked_at

drugs
  ├── id (PK), name_ko, generic_name
  └── drug_class, is_otc, description

drug_interactions
  ├── drug_a_id, drug_b_id (FK → drugs)
  └── severity, description
```

---

## 🔌 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/auth/kakao` | 카카오 로그인 (code → JWT) |
| POST | `/upload/prescription` | 처방전 이미지 업로드 → S3 + OCR |
| POST | `/upload/presign` | S3 Presigned URL 발급 |
| POST | `/ocr/submit` | 이미지 URL로 OCR 요청 |
| GET | `/ocr/{id}/status` | OCR 처리 상태 조회 |
| POST | `/ocr/{id}/confirm` | OCR 결과 확인 → 스케줄 생성 |
| GET | `/schedule?date=` | 날짜별 복약 스케줄 조회 |
| PATCH | `/schedule/{id}/check` | 복약 체크/해제 |
| DELETE | `/schedule/{id}` | 스케줄 삭제 |
| GET | `/schedule/stats` | 복약 순응도 통계 |
| GET | `/drugs/search?q=` | 약물 검색 |
| POST | `/drugs/check-interactions` | 약물 상호작용 체크 |
| POST | `/chat/stream` | AI 챗봇 (SSE 스트리밍) |

---

## 🚀 시작하기

### 사전 요구사항

- Node.js 18+
- Python 3.11+
- PostgreSQL 16
- Redis 7
- Docker & Docker Compose (선택)

### 1. 환경변수 설정

```bash
# backend/.env
DATABASE_URL=postgresql+asyncpg://clinicalcare:<password>@localhost:5432/clinicalcare
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=<your_openai_api_key>
CLOVA_OCR_URL=<your_clova_ocr_url>
CLOVA_OCR_SECRET=<your_clova_ocr_secret>
AWS_ACCESS_KEY=<your_aws_access_key>
AWS_SECRET_KEY=<your_aws_secret_key>
AWS_REGION=ap-northeast-2
S3_BUCKET=<your_s3_bucket>
KAKAO_REST_API_KEY=<your_kakao_rest_api_key>
KAKAO_REDIRECT_URI=http://localhost:3000/auth/callback/kakao
JWT_SECRET_KEY=<your_jwt_secret>

# frontend/.env.local
NEXT_PUBLIC_KAKAO_REST_API_KEY=<your_kakao_rest_api_key>
NEXT_PUBLIC_KAKAO_REDIRECT_URI=http://localhost:3000/auth/callback/kakao
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2-A. Docker로 실행 (권장)

```bash
docker-compose up -d
```

### 2-B. 로컬 실행

**백엔드:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**프론트엔드:**
```bash
cd frontend
npm install
npm run dev
```

### 3. 접속

| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger 문서 | http://localhost:8000/docs |

---

## 📱 화면 구성

| 화면 | 경로 | 설명 |
|------|------|------|
| 로그인 | `/login` | 카카오 소셜 로그인 |
| 처방전 업로드 | `/upload` | 카메라/갤러리에서 처방전 촬영·선택 |
| OCR 결과 | `/ocr/[id]` | 인식된 약물 목록 확인·수정 → 스케줄 생성 |
| 복약 스케줄 | `/schedule` | 날짜별 복약 체크리스트 + 순응도 통계 |
| AI 챗봇 | `/chat` | 복약 관련 질문 실시간 상담 |

---

## ⚠️ 면책 고지

> **본 서비스는 의료 행위를 대체하지 않습니다.**
> 제공되는 정보는 참고용이며, 정확한 진단과 처방은 반드시 의료 전문가와 상담하세요.

---

## 📜 라이선스

이 프로젝트는 [MIT License](LICENSE) 하에 배포됩니다.
