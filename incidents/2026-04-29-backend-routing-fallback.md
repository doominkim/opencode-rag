# Backend Routing Fell Back To General Purpose

## What Failed

`BISlackCronService`의 Slack 알림/집계 변경 요청이 `intent implement`로 분류됐지만 `delegate? general-purpose`로 잡혔다.

해당 작업은 service/cron/domain logic 구현 성격이 강해 범용 fallback보다 backend specialist가 적합했다.

## Why

기존 subagent 경계에는 API 계약(`api`), DB 설계(`db-designer`), UI(`frontend`)는 있었지만 service/cron/batch/worker/domain logic 구현 전용 agent가 없었다.

그 결과 API 계약도 DB schema도 아닌 backend 내부 로직 변경이 `general-purpose` fallback으로 떨어졌다.

## What Was Added To Harness

- `agent/backend.md` 추가
- `plugin/auto-delegate/lib/agents.ts`에 backend routing trigger 추가
- `plugin/auto-delegate/lib/presets.ts`에 backend `deep-think` preset 추가
- `plugin/auto-delegate/hooks/system-inject.ts`와 `tool-def.ts`의 routing reminder 갱신
- `README.md`, `AGENTS.md`, `agent/theseus.md`에 backend 경계 문서화
- `tests/auto-delegate.test.mjs`에 backend routing/preset 테스트 추가

## How To Verify

```bash
npm run verify:plugin
```

다음 prompt가 `backend`로 라우팅되어야 한다.

```text
BISlackCronService Slack 알림 집계 수정
service layer domain logic 추가
```

## Related

- Files: `agent/backend.md`, `plugin/auto-delegate/lib/agents.ts`, `plugin/auto-delegate/lib/presets.ts`, `tests/auto-delegate.test.mjs`
