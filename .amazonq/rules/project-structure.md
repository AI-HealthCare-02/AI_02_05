# PillMate Project Structure

## Service Overview
만성질환자(고혈압, 당뇨 등)와 보호자를 위한 처방전 기반 복약 관리 모바일 웹서비스.
처방전 사진 → Clova OCR → GPT-4o-mini → 복약 스케줄 자동 생성 → 카카오톡 알림.
루트 폴더명: clinicalcare/

## Tech Stack
- Backend: FastAPI + APScheduler
- Frontend: Next.js (App Router, TypeScript)
- OCR: Naver Clova OCR API
- AI: OpenAI GPT-4o-mini
- 알림: Web Push + 카카오톡 알림톡
- 인증: 카카오 로그인 + JWT
- Infra: Docker, Nginx, Vercel, GitHub Actions CI/CD

## Directory Map
- `backend/app/main.py` : FastAPI 엔트리포인트, APScheduler 등록
- `backend/app/core/` : 설정(config), DB연결, 공통 예외처리
- `backend/app/models/` : DB 모델
- `backend/app/schemas/` : Pydantic DTO (auth, ocr, schedule)
- `backend/app/repositories/` : DB 접근 레이어
- `backend/app/services/` : 핵심 비즈니스 로직
  - `auth_service.py` : 카카오 로그인, JWT
  - `ocr_service.py` : OCR 파이프라인
  - `schedule_service.py` : 복약 스케줄 관리
  - `push_service.py` : 알림 발송
- `backend/app/api/routes/` : API 라우터
- `frontend/src/app/` : Next.js App Router 페이지
- `frontend/src/lib/` : Axios 인스턴스, 에러 코드
- `frontend/src/types/index.ts` : 공통 타입 정의
- `nginx/nginx.conf` : 리버스 프록시 설정

## Excluded Directories (절대 스캔 금지)
- `backend/venv/`, `backend/.venv/` : Python 가상환경
- `backend/__pycache__/` : 캐시
- `frontend/node_modules/` : 패키지
- `frontend/.next/` : Next.js 빌드 결과물
- `.git/` : Git 내부
- `media/`, `uploads/` : 처방전 이미지 (대용량)

## Key Domain Concepts
- Patient(환자) / Guardian(보호자) 이중 사용자 구조
- Prescription(처방전) : OCR로 인식한 원본 데이터
- Medication(약물) : 처방전에서 추출한 개별 약물 정보
- Schedule(복약 스케줄) : 복약 시간, 횟수, 기간
- Notification(알림) : 카카오톡 알림톡 + Web Push 발송 이력