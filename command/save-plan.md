---
description: 현재 작업을 마일스톤 단위 plan으로 분해해 .plans/<slug>.md에 저장합니다.
agent: prometheus
argument-hint: <slug>
---

# /save-plan

prometheus agent에게 위임해 현재 작업을 `.plans/<slug>.md`로 저장한다.

## STEP 0
TodoWrite 또는 작업 분해 메모를 통해 진행 항목 후보를 식별한다.

## STEP 1 (ONE AT A TIME)
prometheus agent를 호출해 다음을 수행한다:
1. 현재 작업 컨텍스트와 의도 요약
2. 마일스톤 4~6개로 분해
3. 각 마일스톤의 deliverable, 의존성, 검증 방법, 롤백 명시
4. 의존 그래프와 위험 정리
5. `.plans/<slug>.md`로 저장하고 경로 반환

## 출력
- 저장 경로: `.plans/<slug>.md`
- 마일스톤 ID 목록
- 권장 진행 순서
- 다음 단계 (구현 시작 또는 추가 검토)

## 금지
- 코드 수정 (prometheus는 plan 본문만 write)
- destructive 명령 실행
- `.plans/` 외 경로 write
