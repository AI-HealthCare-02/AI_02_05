# Context Management Rules

## Scanning Policy
- @workspace 전체 스캔 사용 금지
- 구조 파악이 필요하면 project-structure.md를 먼저 참고
- 질문과 직접 관련된 파일/폴더만 참조할 것
- 한 번의 응답에 참조 파일은 최대 10개 이내

## Large File Handling
- 처방전 이미지, OCR 응답 JSON 등 대용량 데이터 로드 금지
- 300줄 이상 파일은 관련 함수/클래스만 참조

## API Key Safety
- .env 파일 내용을 응답에 절대 포함하지 말 것
- Clova OCR, OpenAI, 카카오 API 키는 코드에 하드코딩 제안 금지
- docker-compose.yml 내 환경변수 값 노출 금지