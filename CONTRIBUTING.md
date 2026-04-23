# 🤝 PillMate 협업 가이드

## 브랜치 전략

```
main        ← 배포 브랜치 (직접 push 금지)
develop     ← 통합 브랜치
feat/*      ← 기능 개발
fix/*       ← 버그 수정
```

## 작업 흐름

```bash
# 1. develop에서 새 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feat/기능이름

# 2. 작업 후 커밋
git add .
git commit -m "feat: 기능 설명"

# 3. develop에 push
git push origin feat/기능이름

# 4. GitHub에서 develop으로 PR 생성
# 5. 코드 리뷰 후 머지
# 6. develop → main PR 생성 후 테스트 통과 시 배포
```

## 커밋 메시지 규칙

| 타입 | 설명 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 리팩토링 |
| `docs` | 문서 수정 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드/설정 변경 |

## 로컬 개발 환경 설정

```bash
# 백엔드
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # 환경변수 설정

# 프론트엔드
cd frontend
npm install
cp .env.local.example .env.local  # 환경변수 설정
```

## 테스트 실행

```bash
cd backend
PYTHONPATH=. pytest tests/ -v
```

## 환경변수

팀장에게 `.env` 파일 요청하세요. (절대 GitHub에 올리지 마세요!)

## 모니터링

| 서비스 | URL | 계정 |
|--------|-----|------|
| 운영 대시보드 | http://3.34.192.109/admin | PW: 팀장에게 문의 |
| Grafana | http://3.34.192.109:3001 | admin / 팀장에게 문의 |
| Prometheus | http://3.34.192.109:9090 | - |
