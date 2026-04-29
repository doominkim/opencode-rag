---
description: theseus orchestrator로 작업을 시작합니다. 의도 분류 → 위임 → 검증까지 자동 진행.
agent: theseus
argument-hint: <task 설명>
---

# /work

theseus orchestrator에게 작업을 위임한다.

## 진입 즉시 theseus가 출력해야 할 것 (FIRST OUTPUT)

세 줄 이내로 즉시 다음을 출력한다. 침묵 금지.

```
[intent] <classify|implement|diagnose|locate|review|plan> — <한 문장 근거>
[plan] <다음 1~3 행동>
[delegate?] <specialist 또는 "none">
```

## 그 다음

1. 위 출력 직후 즉시 행동 (Task 호출 또는 작업)
2. 위임 시 6필드 contract: TASK / EXPECTED OUTCOME / REQUIRED TOOLS / MUST DO / MUST NOT DO / CONTEXT
3. 독립 영역은 한 메시지에 병렬 위임
4. 검증 게이트 통과 전 종료 금지
5. 실패 시 최대 3회 재위임, 초과 시 사용자 보고

## 사용자 승인 게이트

destructive 명령 / 결제·배포 영향 / 요구사항 다중 해석 → 멈추고 질문.

## 사용하지 않을 시점

- 단일 줄 fix, 명백한 typo
- 한 문장 답변이면 충분한 질문
