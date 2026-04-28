# 💊 PillMate — 처방전 기반 복약 관리 서비스

> 처방전 촬영 → OCR 자동 인식 → 복약 스케줄 생성 → AI 챗봇 상담 → 카카오톡 알림까지, 원스톱 복약 관리

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.135-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)
![Vercel](https://img.shields.io/badge/Vercel-HTTPS-000000?logo=vercel)
![License](https://img.shields.io/badge/License-MIT-green)

**🌐 서비스 주소 (HTTPS):** https://pill-mate-six.vercel.app

---

## 📋 프로젝트 소개

**PillMate**는 만성질환자(고혈압, 당뇨 등)와 보호자를 위한 처방전 기반 복약 관리 모바일 웹서비스입니다.

처방전 사진 한 장으로 복약 관리를 시작할 수 있으며, Clova OCR + GPT-4o-mini로 약물 정보를 자동 인식하고 복약 스케줄을 생성합니다. 복약 시간이 되면 카카오톡으로 알림을 받을 수 있어요.

### 핵심 기능

| 기능 | 설명 |
|------|------|
| 📸 **처방전 OCR** | 처방전 촬영 → Clova OCR + GPT 파싱 → 약물명/용량/복용법 자동 인식 |
| 📅 **복약 스케줄** | 약봉투 UI + 시간대별 그룹 카드 + 날짜 캘린더 뷰 |
| 📊 **복약 통계** | 복약 순응도, 연속 복약일, 월별 달력 히트맵 |
| 💊 **약물 상호작용** | 복용 약물 간 상호작용 심각도별 경고 |
| 💬 **AI 챗봇** | 현재 복약 중인 약물 컨텍스트 기반 맞춤 상담 (SSE 스트리밍) |
| 🔔 **카카오톡 알림** | 복약 시간에 카카오톡으로 알림 자동 발송 |
| 👨‍👩‍👧 **보호자 공유** | 공유 링크로 보호자가 복약 현황 실시간 확인 |
| 🔐 **카카오 로그인** | OAuth2 카카오 소셜 로그인 + JWT 인증 |
| 📋 **처방전 관리** | 등록된 처방전 목록 조회 + 약물 확인 + 삭제 |

---

## 🏗️ 시스템 아키텍처

```
사용자 (모바일 웹)
      ↓
Vercel (HTTPS 프론트엔드)
      ↓ rewrites 프록시
EC2 Nginx (리버스 프록시)
      ↓
FastAPI Backend (REST API + SSE)
      ↓
PostgreSQL 16 + Redis 7
      ↓
외부 서비스
├─ Naver Clova OCR
├─ OpenAI GPT-4o-mini
├─ AWS S3
├─ 카카오 OAuth2
└─ 카카오 메시지 API (나에게 보내기)
```

### 배포 구조
```
Vercel
└── Next.js 16 Frontend (HTTPS)

EC2 (t2.medium)
├── nginx 컨테이너      (80포트, 리버스 프록시)
├── backend 컨테이너    (FastAPI)
├── db 컨테이너         (PostgreSQL 16)
├── redis 컨테이너      (캐시/세션)
├── prometheus 컨테이너 (메트릭 수집)
└── grafana 컨테이너    (모니터링 대시보드)
```

---

## 📁 프로젝트 구조

```
clinicalcare/
├── README.md
├── docker-compose.yml
│
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI 엔트리포인트 + APScheduler
│   │   ├── middleware.py             # Rate Limiting + Request Logging
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── exceptions.py         # 통일된 HTTP 에러 코드
│   │   ├── models/
│   │   ├── schemas/                  # DTO 클래스 (Pydantic)
│   │   │   ├── auth.py
│   │   │   ├── ocr.py
│   │   │   └── schedule.py
│   │   ├── repositories/
│   │   ├── services/
│   │   │   ├── auth_service.py       # 카카오 로그인 + JWT
│   │   │   ├── ocr_service.py        # OCR 처리 파이프라인
│   │   │   ├── schedule_service.py   # 복약 스케줄 관리
│   │   │   ├── push_service.py       # Web Push + 카카오톡 알림
│   │   │   └── ...
│   │   └── api/routes/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── schedule/page.tsx     # 약봉투 UI 복약 스케줄
│   │   │   ├── ocr/[id]/page.tsx     # 처방전 확인/수정
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── api.ts                # Axios 인스턴스
│   │   │   └── errors.ts             # 에러 코드 상수
│   │   └── types/index.ts
│   ├── next.config.ts                # Vercel rewrites 프록시 설정
│   └── package.json
│
├── nginx/nginx.conf
└── .github/workflows/                # CI/CD
```

---

## 🛠️ 기술 스택

| 레이어 | 기술 | 버전 |
|--------|------|------|
| **Frontend** | Next.js + React + TypeScript | 16 / 19 |
| **스타일링** | Tailwind CSS | 4 |
| **상태관리** | TanStack React Query | 5 |
| **Backend** | FastAPI (Python) | 0.135 |
| **ORM** | SQLAlchemy (Async) | 2.0 |
| **DB** | PostgreSQL | 16 |
| **Cache** | Redis | 7 |
| **스케줄러** | APScheduler | 3.10 |
| **OCR** | Naver Clova OCR | - |
| **AI** | OpenAI GPT-4o-mini | - |
| **스토리지** | AWS S3 | - |
| **인증** | 카카오 OAuth2 + JWT | - |
| **알림** | 카카오 메시지 API + Web Push | - |
| **모니터링** | Prometheus + Grafana | - |
| **배포** | Vercel + Docker Compose + EC2 | - |
| **CI/CD** | GitHub Actions | - |

---

## 🗄️ ERD

```
users
  ├── id (UUID, PK)
  ├── oauth_provider, oauth_id
  ├── kakao_access_token            ← 카카오톡 알림용
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

schedule_checks / push_subscriptions / share_tokens / drugs / drug_interactions
```

---

## 🔌 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/auth/kakao` | 카카오 로그인 |
| POST | `/upload/prescription` | 처방전 업로드 → S3 + OCR |
| GET | `/ocr/list` | 처방전 목록 조회 |
| POST | `/ocr/{id}/confirm` | OCR 확인 → 스케줄 생성 |
| GET | `/schedule/` | 날짜별 스케줄 조회 |
| GET | `/schedule/stats` | 복약 순응도 통계 |
| PATCH | `/schedule/{id}/check` | 복약 체크/해제 |
| POST | `/chat/stream` | AI 챗봇 (SSE) |
| POST | `/push/subscribe` | 푸시 구독 |
| POST | `/share/` | 공유 링크 생성 |
| GET | `/share/{token}/view` | 보호자 공유 뷰 |

---

## ⚙️ 주요 구현 사항

### 약봉투 UI
복약 스케줄 페이지를 실제 약봉투처럼 디자인했어요. SVG 지그재그 tear line, 시간대별 봉투 연결, 약물별 고유 색상 캡슐 아이콘을 적용했습니다.

### 카카오톡 복약 알림
APScheduler로 매분 복약 시간을 체크하고, 카카오 메시지 API(나에게 보내기)로 본인 카카오톡에 알림을 발송합니다. KST 시간대 기준으로 동작합니다.

### Rate Limiting 미들웨어
Redis 기반 IP별 분당 요청 제한을 구현했습니다. OCR/업로드는 분당 10회, 챗봇은 분당 30회로 제한해 외부 API 비용을 보호합니다.

### HTTP 에러 코드 체계화
모든 에러 응답을 `{"code": "NOT_FOUND", "message": "..."}` 형식으로 통일하고, 프론트엔드에서 `errors.ts`로 중앙 관리합니다.

### Vercel + EC2 하이브리드 배포
프론트엔드는 Vercel(HTTPS), 백엔드는 EC2(HTTP)로 분리 배포했습니다. Mixed Content 문제를 Next.js rewrites로 해결해 Vercel이 백엔드 프록시 역할을 합니다.

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
S3_BUCKET=<your_s3_bucket>
KAKAO_REST_API_KEY=<your_kakao_rest_api_key>
KAKAO_CLIENT_SECRET=<your_kakao_client_secret>
KAKAO_REDIRECT_URI=http://localhost:3000/auth/callback/kakao
JWT_SECRET_KEY=<your_jwt_secret>
VAPID_PRIVATE_KEY=<your_vapid_private_key>
VAPID_PUBLIC_KEY=<your_vapid_public_key>

# frontend/.env.local
NEXT_PUBLIC_KAKAO_REST_API_KEY=<your_kakao_rest_api_key>
NEXT_PUBLIC_KAKAO_REDIRECT_URI=http://localhost:3000/auth/callback/kakao
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Docker로 실행

```bash
docker-compose up -d
```

---

## ⚠️ 면책 고지

> **본 서비스는 의료 행위를 대체하지 않습니다.**
> 제공되는 정보는 참고용이며, 정확한 진단과 처방은 반드시 의료 전문가와 상담하세요.

---

## 📜 라이선스

이 프로젝트는 [MIT License](LICENSE) 하에 배포됩니다.
