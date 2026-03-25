# 🏥 ClinicalCare — AI 기반 복약안내 및 생활습관 개선 가이드 시스템

> 증상 입력 → 질환 분석 → 복약 안내 → 맞춤 생활습관 추천까지, AI가 건강 관리를 도와드립니다.

![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Claude API](https://img.shields.io/badge/Claude_API-Sonnet-7C3AED?logo=anthropic)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 프로젝트 소개

**ClinicalCare**는 일반 사용자(환자)를 위한 셀프케어 건강 관리 웹서비스입니다.

증상을 체크리스트로 입력하면 AI가 가능한 질환을 분석하고, 일반의약품(OTC) 복약 안내와 맞춤형 생활습관(식단/운동/수면) 개선을 추천합니다. 약물 상호작용 체크와 Claude API 기반 AI 상담까지 원스톱으로 제공합니다.

### 핵심 기능

| 기능 | 설명 |
|------|------|
| 🔍 **증상 → 질환 매핑** | 체크리스트/검색으로 증상 입력 → 확률 기반 질환 후보 + 복약 안내 |
| 🌿 **생활습관 추천** | 질환 + 프로필 기반 맞춤 식단/운동/수면 가이드 |
| 💊 **약물 상호작용 체크** | 복용 약물 간 상호작용 심각도별 경고 |
| 💬 **AI 챗봇 상담** | Claude API 연동, 분석 결과 컨텍스트 기반 건강 상담 |
| 📊 **건강 리포트** | 주간/월간 건강 데이터 종합 PDF 리포트 생성 |

---

## 🏗️ 시스템 아키텍처

```
사용자 (환자/일반인)
        ↓
React Frontend (TypeScript + Tailwind CSS)
        ↓
FastAPI Backend (REST API + 비즈니스 로직)
  ├─ 증상 → 질환 매핑 + 복약 안내
  ├─ 생활습관 추천 (식단/운동/수면)
  ├─ 약물 상호작용 체크
  ├─ AI 챗봇 상담 (Claude API)
  └─ 건강 리포트 생성 (PDF)
        ↓
PostgreSQL + Redis
  ├─ 사용자 건강 기록 (증상/복약 이력)
  └─ 참조 데이터 (질환/약물/생활습관 DB)
```

---

## 📁 프로젝트 구조

```
AI_02_05/
├── README.md
├── .gitignore
├── .env.example
│
├── docs/                           # 기획 문서
│   ├── 곽호준_ClinicalCare_기획문서_v1.0.xlsx
│   ├── ERD.md
│   └── API_SPEC.md
│
├── frontend/                       # React + TypeScript
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── common/             # Header, Footer, BottomNav
│       │   ├── symptom/            # 증상 체크 모듈
│       │   ├── lifestyle/          # 생활습관 모듈
│       │   ├── drug/               # 약물 체크 모듈
│       │   └── chatbot/            # AI 챗봇 모듈
│       ├── pages/                  # 12개 화면 (SCR-001~012)
│       ├── hooks/                  # Custom hooks
│       ├── services/               # API 클라이언트
│       └── types/                  # TypeScript 타입
│
├── backend/                        # FastAPI + Python
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   └── app/
│       ├── main.py                 # FastAPI 엔트리포인트
│       ├── config.py
│       ├── models/                 # SQLAlchemy ORM
│       ├── schemas/                # Pydantic 스키마
│       ├── routers/                # API 라우터
│       ├── services/               # 비즈니스 로직
│       └── data/                   # 데이터 시드 스크립트
│
├── data/                           # Kaggle 원본 데이터셋
│   └── README.md
│
└── docker-compose.yml
```

---

## 🛠️ 기술 스택

| 레이어 | 기술 | 버전 |
|--------|------|------|
| **Frontend** | React + TypeScript + Tailwind CSS | 18.x |
| **Build Tool** | Vite | 5.x |
| **Backend** | FastAPI (Python) | 0.100+ |
| **ORM** | SQLAlchemy | 2.0 |
| **DB** | PostgreSQL | 16 |
| **Cache** | Redis | 7 |
| **AI** | Claude API (Sonnet) | - |
| **PDF** | ReportLab (한국어 CID 폰트) | - |
| **인증** | JWT + OAuth2 (Kakao/Naver) | - |
| **배포** | Docker Compose | - |

---

## 🚀 시작하기

### 사전 요구사항

- Node.js 18+
- Python 3.11+
- PostgreSQL 16
- Redis 7
- Docker & Docker Compose (선택)

### 1. 레포지토리 클론

```bash
git clone https://github.com/AI-HealthCare-02/AI_02_05.git
cd AI_02_05
```

### 2. 환경변수 설정

```bash
cp .env.example .env
# .env 파일을 열어 필요한 값을 설정하세요
```

### 3-A. Docker로 실행 (권장)

```bash
docker-compose up -d
```

### 3-B. 로컬 실행

**백엔드:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**프론트엔드:**
```bash
cd frontend
npm install
npm run dev
```

### 4. 접속

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API 문서 (Swagger): http://localhost:8000/docs

---

## 📄 기획 문서

| 문서 | 설명 | 위치 |
|------|------|------|
| **요구사항 정의서** | 22건 (기능 18 + 비기능 4) | `docs/기획문서.xlsx` - Sheet 1 |
| **API 명세서** | 13개 엔드포인트 | `docs/기획문서.xlsx` - Sheet 2 |
| **화면 정의서** | 12개 화면 (SCR-001~012) | `docs/기획문서.xlsx` - Sheet 3 |
| **ERD** | 12개 테이블 + 뷰 + 함수 | `docs/ERD.md` |

---

## 👥 팀 정보

| 역할 | 이름 | 담당 |
|------|------|------|


---

## ⚠️ 면책 고지

> **본 서비스는 의료 행위를 대체하지 않습니다.**
> 제공되는 정보는 참고용이며, 정확한 진단과 처방은 반드시 의료 전문가와 상담하세요.

---

## 📜 라이선스

이 프로젝트는 [MIT License](LICENSE) 하에 배포됩니다.
