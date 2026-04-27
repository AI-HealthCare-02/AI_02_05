# 💊 PillMate 개발 기여 가이드

## 브랜치 전략

```
main      → 배포용 (Vercel 자동 배포, PR로만 머지 가능)
develop   → 통합 브랜치 (PR로만 머지 가능)
feat/*    → 기능 개발 브랜치
fix/*     → 버그 수정 브랜치
```

---

## 작업 흐름

### 1. 작업 시작 전 항상 develop 최신화

```bash
git checkout develop
git pull origin develop
```

### 2. 작업 브랜치 생성

```bash
git checkout -b feat/기능명
# 예시: feat/voice-chat, feat/share-ui, fix/ocr-timeout
```

### 3. 작업 후 커밋

```bash
git add .
git commit -m "feat: 기능 설명"
```

### 4. 원격에 push

```bash
git push origin feat/기능명
```

### 5. GitHub에서 PR 생성

- **base**: `develop`
- **compare**: `feat/기능명`
- PR 제목: 커밋 메시지와 동일하게
- PR 설명: 변경 사항 간단히 작성

### 6. 팀원 리뷰 & Approve

- 최소 **1명 Approve** 필요
- 리뷰어는 코드 확인 후 Approve 또는 Request Changes

### 7. 머지 후 브랜치 삭제

```bash
git branch -d feat/기능명
```

### 8. develop → main 배포

- 기능이 충분히 쌓이면 develop → main PR 생성
- Approve 후 머지하면 Vercel 자동 배포

---

## 커밋 메시지 규칙

| 태그 | 설명 |
|------|------|
| `feat:` | 새로운 기능 |
| `fix:` | 버그 수정 |
| `docs:` | 문서 수정 |
| `style:` | 코드 포맷 변경 (기능 변경 없음) |
| `refactor:` | 코드 리팩토링 |
| `test:` | 테스트 추가/수정 |
| `chore:` | 빌드, 설정 변경 |

**예시:**
```
feat: 음성 인식 챗봇 마이크 버튼 추가
fix: OCR timeout 20초 설정
docs: CONTRIBUTING.md 업데이트
```

---

## 로컬 개발 환경 설정

### 백엔드

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# .env 파일 설정 (팀원에게 요청)
# DB 마이그레이션
alembic upgrade head

# 서버 실행
uvicorn app.main:app --reload
```

### 프론트엔드

```bash
cd frontend
npm install

# .env.local 파일 설정 (팀원에게 요청)
# 개발 서버 실행
npm run dev
```

---

## PR 체크리스트

PR 생성 시 아래 항목 확인해주세요.

- [ ] `develop` 브랜치 기준으로 작업했나요?
- [ ] 로컬에서 빌드/실행 확인했나요? (`npm run build`)
- [ ] 커밋 메시지 규칙을 지켰나요?
- [ ] 불필요한 파일(`.env`, `__pycache__` 등)이 포함되지 않았나요?
- [ ] PR 설명에 변경 사항을 작성했나요?

---

## 주의사항

- `.env` 파일은 **절대 커밋하지 마세요**
- `main` 브랜치에 **직접 push하지 마세요**
- 작업 전 **항상 `git pull origin develop` 먼저** 하세요
- `__pycache__`, `*.pyc`, `node_modules` 는 커밋하지 마세요
