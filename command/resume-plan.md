---
description: .plans/<slug>.md를 로드해 metis agent에게 다음 마일스톤 실행을 위임합니다.
agent: metis
argument-hint: <slug>
---

# /resume-plan

`.plans/<slug>.md`와 `.plans/<slug>.state.json`을 로드해 metis가 다음 마일스톤을 한 단계 실행한다.

## STEP 0
`.plans/<slug>.md` 존재를 확인한다. 없으면 즉시 실패 보고하고 `/save-plan <slug>` 사용을 안내한다.

## STEP 1 (ONE AT A TIME)
metis agent를 호출해 다음을 수행한다:
1. `.plans/<slug>.md` 본문 로드
2. `.plans/<slug>.state.json` 로드 (없으면 첫 마일스톤부터 시작)
3. **다음 한 마일스톤만** 실행 (여러 단계 동시 실행 금지)
4. 단계 끝에 비파괴 검증 실행
5. 검증 통과 시 `.plans/<slug>.state.json` 갱신
6. 검증 실패 시 다음 마일스톤 진행 금지, 실패 원인 보고

## 출력
- 실행한 마일스톤 ID
- deliverable 변경 파일 목록
- 검증 명령과 결과
- state.json 변경 요약
- 다음 마일스톤 ID 또는 plan 종료 여부

## 금지
- plan 본문 수정 (prometheus 영역)
- 한 메시지에서 여러 마일스톤 동시 실행
- destructive 명령 사용자 승인 없이 실행
- commit/push 사용자 승인 없이 실행
