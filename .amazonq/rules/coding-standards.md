# Coding Standards

## Backend (FastAPI / Python)
- Python 3.10+ 문법 사용
- 함수/변수명 snake_case, 클래스명 PascalCase
- 모든 함수에 타입 힌트 필수 (def foo(x: int) -> str)
- DB 접근은 반드시 repositories/ 레이어를 통해서만
- 비즈니스 로직은 services/에만 작성, routes/에 직접 금지
- 에러는 core/exceptions.py의 커스텀 예외 사용

## Frontend (Next.js / TypeScript)
- any 타입 사용 금지, 타입은 types/index.ts에 정의
- API 호출은 반드시 lib/api.ts의 Axios 인스턴스 사용
- 에러 코드는 lib/errors.ts 상수 참조

## 공통
- 환경변수는 .env에서만 관리, 코드에 하드코딩 금지
- 주석은 한국어로 작성