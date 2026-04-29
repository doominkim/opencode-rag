# Orchestration Guide

## 선택 기준

| 상황 | 권장 진입점 |
|---|---|
| 한 문장 답변, 단일 typo | 그냥 질문 |
| 코드 위치/패턴 탐색 | `/research` 또는 `explore` |
| 구현/진단/리뷰가 섞인 작업 | `/work` |
| 큰 작업 분해 | `/save-plan <slug>` |
| 저장된 plan 실행 | `/resume-plan <slug>` |
| 현재 변경 검증 | `/verify` |
| RAG sync/load/bootstrap | `/rag-safe-work` |

## `/work` 흐름

`theseus`가 다음 순서로 작업한다.

1. 의도 분류
2. specialist 위임 여부 결정
3. 6필드 contract로 Task 작성
4. 독립 영역 병렬 위임
5. 비파괴 검증
6. 실패 시 재시도 루프 없이 원인 확인 후 직접 처리하거나 사용자 보고

## Plan 흐름

긴 작업은 plan 본문과 runtime state를 분리한다.

| 파일 | 역할 |
|---|---|
| `.plans/<slug>.md` | commit 대상 plan 본문 |
| `.plans/<slug>.state.json` | gitignore된 실행 상태 |

검증 실패 시 다음 마일스톤으로 진행하지 않는다. destructive 단계는 반드시 사용자 승인 게이트를 plan에 적는다.

## 직접 처리 기준

다음은 직접 처리해도 된다.
- 단일 파일의 작은 수정
- 명백한 typo
- 한 문장 설명
- 되돌리기 쉽고 기존 패턴만 따르면 되는 변경

그 외에는 specialist 위임을 우선한다.
