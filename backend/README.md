# ClinicalCare+ Backend

의료진과 환자를 위한 임상 케어 관리 시스템의 백엔드 API 서버입니다.

## 🏥 주요 기능

- **OCR 기반 처방전 인식**: Clova OCR을 활용한 처방전 자동 인식
- **약물 정보 관리**: 의약품 데이터베이스 및 상호작용 정보 제공
- **복용 일정 관리**: 환자별 맞춤 복용 스케줄 관리
- **파일 업로드**: AWS S3를 통한 안전한 파일 저장
- **사용자 관리**: 환자 및 의료진 계정 관리

## 🛠 기술 스택

- **Framework**: FastAPI
- **Database**: PostgreSQL + SQLAlchemy ORM
- **Cache**: Redis
- **Cloud Storage**: AWS S3
- **OCR**: Naver Clova OCR
- **AI**: OpenAI API
- **Migration**: Alembic

## 📁 프로젝트 구조

```
backend/
├── app/
│   ├── api/routes/          # API 라우터
│   ├── core/               # 핵심 설정 및 데이터베이스
│   ├── models/             # SQLAlchemy 모델
│   ├── repositories/       # 데이터 접근 계층
│   ├── services/           # 비즈니스 로직
│   └── main.py            # FastAPI 애플리케이션 진입점
├── alembic/               # 데이터베이스 마이그레이션
├── uploads/               # 업로드된 파일 임시 저장소
└── .env                   # 환경 변수 설정
```

## 🚀 설치 및 실행

### 1. 환경 설정

```bash
# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
DATABASE_URL=postgresql://user:password@localhost/clinicalcare
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_openai_api_key
CLOVA_OCR_URL=your_clova_ocr_url
CLOVA_OCR_SECRET=your_clova_ocr_secret
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_REGION=ap-northeast-2
S3_BUCKET=your_s3_bucket_name
S3_PRESIGNED_EXPIRY=300
DEBUG=false
```

### 3. 데이터베이스 마이그레이션

```bash
# 마이그레이션 실행
alembic upgrade head
```

### 4. 서버 실행

```bash
# 개발 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📚 API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔗 주요 엔드포인트

- `GET /health` - 서버 상태 확인
- `POST /upload` - 파일 업로드
- `POST /ocr` - OCR 처리
- `GET /drugs` - 약물 정보 조회
- `POST /schedule` - 복용 일정 생성

## 🗄 데이터베이스 모델

- **User**: 사용자 정보
- **Drug**: 의약품 정보
- **DrugInteraction**: 약물 상호작용
- **MedicationSchedule**: 복용 일정
- **OCRResult**: OCR 처리 결과

## 🔧 개발 환경

- Python 3.8+
- PostgreSQL 12+
- Redis 6+

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.