# Skills

2계층 구조로 구성된다.

## 계층

### `_presets/` — 모델·온도·max_tokens 프리셋
호출 비용/속도/깊이 트레이드오프를 추상 라벨로 표현한다. 모델 ID는 한 곳에서만 관리해 모델 deprecated 시 mapping만 갱신한다.

- `quick` — 저비용, 빠른 응답
- `research` — 탐색·요약 중심
- `deep-think` — 큰 추론·설계
- `cheap-bulk` — 반복적·기계적 작업

### `domain/` — 도메인 지식과 안전 규칙
실행 컨텍스트와 정책을 주입한다.

- `rag-ops` — RAG 검색·적재·sync 안전 규칙
- `git-master` — git 히스토리, diff, commit 메시지
- `review-work` — 리뷰 우선순위와 finding 형식
- `frontend-ui-ux` — UI/UX 구현 가이드

## 합성 패턴
`delegate(category=<preset>, skills=[<domain>...])` — 카테고리는 모델 라우팅, 스킬은 지식·정책 주입. router가 prompt 패턴에 따라 자동 결합한다 (M5 plugin 단계에서 활성화).

## 추가
- 신규 도메인: `domain/<name>/SKILL.md`
- 신규 프리셋: `_presets/<name>.md`
