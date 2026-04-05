# 💊 PillMate — 처방전 기반 복약 관리 서비스

> 처방전 촬영 → OCR 자동 인식 → 복약 스케줄 생성 → AI 챗봇 상담까지, 원스톱 복약 관리

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)
![License](https://img.shields.io/badge/License-MIT-green)

**🌐 서비스 주소:** http://3.34.192.109

---

## 📋 프로젝트 소개

**PillMate**는 만성질환자(고혈압, 당뇨 등)와 보호자를 위한 처방전 기반 복약 관리 모바일 웹서비스입니다.

처방전 사진 한 장으로 복약 관리를 시작할 수 있으며, Clova OCR + GPT-4o-mini로 약물 정보를 자동 인식하고 복약 스케줄을 생성합니다.

### 핵심 기능

| 기능 | 설명 |
|------|------|
| 📸 **처방전 OCR** | 처방전 촬영 → Clova OCR + GPT 파싱 → 약물명/용량/복용법 자동 인식 |
| 📅 **복약 스케줄** | 시간대별 그룹 카드 + 처방전별 분리 + 날짜 캘린더 뷰 |
| 📊 **복약 통계** | 복약 순응도, 연속 복약일, 월별 달력 히트맵 |
| 💊 **약물 상호작용** | 복용 약물 간 상호작용 심각도별 경고 |
| 💬 **AI 챗봇** | 현재 복약 중인 약물 컨텍스트 기반 맞춤 상담 (SSE 스트리밍) |
| 👨‍👩‍👧 **보호자 공유** | 공유 링크로 보호자가 복약 현황 실시간 확인 |
| 🔐 **카카오 로그인** | OAuth2 카카오 소셜 로그인 + JWT 인증 |
| 📋 **처방전 관리** | 등록된 처방전 목록 조회 + 약물 확인 + 삭제 |

---

## 🏗️ 시스템 아키텍처

```
사용자 (모바일 웹)
      ↓
Nginx (리버스 프록시)
      ↓
Next.js 16 Frontend          FastAPI Backend
(React 19 + TypeScript)  ←→  (REST API + SSE)
      ↓  Axios + React Query       ↓
                          PostgreSQL 16 + Redis 7
                                   ↓
                          외부 서비스
                          ├─ Naver Clova OCR
                          ├─ OpenAI GPT-4o-mini
                          ├─ AWS S3
                          └─ 카카오 OAuth2
```

### EC2 배포 구조 (t2.medium)
```
EC2 (3.34.192.109)
├── nginx 컨테이너      (80포트, 리버스 프록시)
├── frontend 컨테이너   (Next.js)
├── backend 컨테이너    (FastAPI)
├── db 컨테이너         (PostgreSQL 16)
└── redis 컨테이너      (캐시/세션)
```

---

## 📁 프로젝트 구조

```
clinicalcare/
├── README.md
├── docker-compose.yml
│
├── backend/                          # FastAPI + Python
│   ├── app/
│   │   ├── main.py                   # FastAPI 엔트리포인트 + APScheduler
│   │   ├── core/
│   │   │   ├── config.py             # 환경변수 (Pydantic Settings)
│   │   │   ├── database.py           # AsyncSession 설정
│   │   │   └── exceptions.py         # 커스텀 예외
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── drug.py
│   │   │   ├── ocr_result.py
│   │   │   ├── medication_schedule.py
│   │   │   ├── push_subscription.py  # Web Push 구독
│   │   │   └── share_token.py        # 보호자 공유 토큰
│   │   ├── repositories/
│   │   ├── services/
│   │   │   ├── auth_service.py       # 카카오 로그인 + JWT
│   │   │   ├── ocr_service.py        # OCR 처리 파이프라인
│   │   │   ├── ocr_parser.py         # GPT-4o-mini 약물 파싱
│   │   │   ├── schedule_service.py   # 복약 스케줄 관리
│   │   │   ├── drug_service.py       # 약물 검색/상호작용
│   │   │   ├── chat_service.py       # AI 챗봇 (복약 컨텍스트 주입)
│   │   │   ├── push_service.py       # Web Push 알림
│   │   │   └── s3_service.py         # S3 업로드
│   │   └── api/routes/
│   │       ├── auth.py
│   │       ├── upload.py
│   │       ├── ocr.py
│   │       ├── schedule.py
│   │       ├── drugs.py
│   │       ├── chat.py
│   │       ├── push.py
│   │       └── share.py
│   └── requirements.txt
│
└── frontend/                         # Next.js 16 + TypeScript
    ├── src/
    │   ├── app/
    │   │   ├── login/page.tsx         # 카카오 로그인
    │   │   ├── upload/page.tsx        # 처방전 업로드 (카메라)
    │   │   ├── ocr/[id]/page.tsx      # OCR 결과 확인/수정
    │   │   ├── schedule/page.tsx      # 복약 스케줄 (캘린더 포함)
    │   │   ├── chat/page.tsx          # AI 챗봇
    │   │   ├── settings/page.tsx      # 설정 (알림/공유/약관)
    │   │   ├── prescriptions/page.tsx # 처방전 관리
    │   │   ├── share/[token]/page.tsx # 보호자 공유 뷰
    │   │   └── terms/page.tsx         # 이용약관/개인정보처리방침
    │   ├── components/
    │   │   └── BottomNav.tsx
    │   ├── hooks/
    │   ├── lib/
    │   │   ├── api.ts
    │   │   └── push.ts               # Web Push 유틸
    │   └── types/index.ts
    └── package.json
```

---

## 🛠️ 기술 스택

| 레이어 | 기술 | 버전 |
|--------|------|------|
| **Frontend** | Next.js + React + TypeScript | 16 / 19 |
| **스타일링** | Tailwind CSS | 4 |
| **상태관리** | TanStack React Query | 5 |
| **Backend** | FastAPI (Python) | 0.100+ |
| **ORM** | SQLAlchemy (Async) | 2.0 |
| **DB** | PostgreSQL | 16 |
| **Cache** | Redis | 7 |
| **스케줄러** | APScheduler | 3.10 |
| **OCR** | Naver Clova OCR | - |
| **AI** | OpenAI GPT-4o-mini | - |
| **스토리지** | AWS S3 | - |
| **인증** | 카카오 OAuth2 + JWT | - |
| **배포** | Docker Compose + EC2 | - |

---

## 🗄️ ERD

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
  ├── status (pending → done/failed)
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

push_subscriptions
  ├── id (UUID, PK)
  ├── user_id (FK → users)
  ├── endpoint, p256dh, auth
  └── enabled, created_at

share_tokens
  ├── id (UUID, PK)
  ├── user_id (FK → users)
  ├── token (unique)
  ├── label
  └── expires_at, created_at

drugs / drug_interactions
  └── 약물 정보 + 상호작용 데이터
```

---

## 🔌 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/auth/kakao` | 카카오 로그인 |
| POST | `/upload/prescription` | 처방전 업로드 → S3 + OCR |
| GET | `/ocr/list` | 처방전 목록 조회 |
| GET | `/ocr/{id}/status` | OCR 상태 조회 |
| POST | `/ocr/{id}/confirm` | OCR 확인 → 스케줄 생성 |
| DELETE | `/ocr/{id}` | 처방전 삭제 |
| GET | `/schedule/` | 날짜별 스케줄 조회 |
| GET | `/schedule/monthly` | 월별 복약 현황 |
| GET | `/schedule/stats` | 복약 순응도 통계 |
| PATCH | `/schedule/{id}/check` | 복약 체크/해제 |
| DELETE | `/schedule/{id}` | 스케줄 삭제 |
| GET | `/drugs/search` | 약물 검색 |
| POST | `/drugs/check-interactions-by-name` | 약물 상호작용 체크 |
| POST | `/chat/stream` | AI 챗봇 (SSE) |
| GET | `/push/vapid-public-key` | VAPID 공개키 |
| POST | `/push/subscribe` | 푸시 구독 |
| DELETE | `/push/unsubscribe` | 푸시 구독 취소 |
| POST | `/share/` | 공유 링크 생성 |
| GET | `/share/list` | 공유 링크 목록 |
| DELETE | `/share/{id}` | 공유 링크 삭제 |
| GET | `/share/{token}/view` | 보호자 공유 뷰 |

---

## 🚀 시작하기

### 환경변수 설정

```bash
# backend/.env
DATABASE_URL=postgresql+asyncpg://postgres:<password>@localhost:5432/clinicalcare
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=<your_openai_api_key>
CLOVA_OCR_URL=<your_clova_ocr_url>
CLOVA_OCR_SECRET=<your_clova_ocr_secret>
AWS_ACCESS_KEY=<your_aws_access_key>
AWS_SECRET_KEY=<your_aws_secret_key>
AWS_REGION=ap-northeast-2
S3_BUCKET=<your_s3_bucket>
KAKAO_REST_API_KEY=<your_kakao_rest_api_key>
KAKAO_CLIENT_SECRET=<your_kakao_client_secret>
KAKAO_REDIRECT_URI=http://localhost:3000/auth/callback/kakao
JWT_SECRET_KEY=<your_jwt_secret>
VAPID_PRIVATE_KEY=<your_vapid_private_key>
VAPID_PUBLIC_KEY=<your_vapid_public_key>
VAPID_EMAIL=mailto:<your_email>

# frontend/.env.local
NEXT_PUBLIC_KAKAO_REST_API_KEY=<your_kakao_rest_api_key>
NEXT_PUBLIC_KAKAO_REDIRECT_URI=http://localhost:3000/auth/callback/kakao
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Docker로 실행 (권장)

```bash
docker-compose up -d
```

### 로컬 실행

```bash
# 백엔드
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 프론트엔드
cd frontend
npm install && npm run dev
```

---

## 📱 화면 구성

| 화면 | 경로 | 설명 |
|------|------|------|
| 로그인 | `/login` | 카카오 소셜 로그인 |
| 처방전 업로드 | `/upload` | 카메라로 처방전 촬영 |
| OCR 결과 | `/ocr/[id]` | 인식된 약물 확인·수정 |
| 복약 스케줄 | `/schedule` | 날짜별 복약 체크 + 캘린더 |
| AI 챗봇 | `/chat` | 복약 맞춤 AI 상담 |
| 설정 | `/settings` | 알림·공유·약관 |
| 처방전 관리 | `/prescriptions` | 처방전 목록·삭제 |
| 보호자 공유 | `/share/[token]` | 로그인 없이 복약 현황 확인 |
| 약관 | `/terms` | 이용약관·개인정보처리방침 |

---

## ⚠️ 면책 고지

> **본 서비스는 의료 행위를 대체하지 않습니다.**
> 제공되는 정보는 참고용이며, 정확한 진단과 처방은 반드시 의료 전문가와 상담하세요.

---

## 📜 라이선스

이 프로젝트는 [MIT License](LICENSE) 하에 배포됩니다.
