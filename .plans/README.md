# .plans

장기 또는 세션 간 작업의 plan과 재개 컨텍스트를 보관한다.

## 네이밍 컨벤션
- `<slug>.md` — plan 본문 (commit 대상)
- `<slug>.state.json` — 런타임 상태, 진행 상황 (gitignore 대상)

## 사용
- plan 작성/저장: `prometheus` agent → `.plans/<slug>.md`
- plan 실행: `metis` agent → `.plans/<slug>.state.json` 갱신
- plan 재개: `/resume-plan <slug>` (M6 단계에서 추가)
- plan 저장: `/save-plan <slug>` (M6 단계에서 추가)

## 정책
- plan 본문은 한국어로 작성한다.
- destructive 단계는 사용자 승인 게이트를 명시한다.
- RAG 디렉터리(`rag/`)와 분리되어 있으며 서로 참조하지 않는다.
- `.state.json`은 commit 대상이 아니다 (재개 시점에 매번 새로 작성).
