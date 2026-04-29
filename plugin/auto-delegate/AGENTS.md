# Auto Delegate Plugin Rules

- OpenCode hook 보조 플러그인이며 agent 자체 교체나 모델 ID 변경은 할 수 없다.
- destructive gate는 `hooks/permission-gate.ts`가 실제 승인 강제를 담당한다.
- destructive 패턴은 `lib/patterns.ts`에 추가하고 `tests/auto-delegate.test.mjs`를 함께 갱신한다.
- routing trigger 변경 시 `lib/agents.ts`, `lib/router.ts`, README의 Delegation Matrix 일관성을 확인한다.
- 수동 검증은 `npm run verify:plugin`을 우선한다.
