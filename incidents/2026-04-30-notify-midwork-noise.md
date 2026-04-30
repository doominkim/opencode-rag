# Notify Midwork Noise

## What Failed
사용자가 assistant가 작업 중인 동안에도 hook 알림이 너무 자주 온다고 보고했다. `session.idle` 이벤트는 tool 호출 사이의 짧은 대기 중에도 발생할 수 있는데, 기존 notify hook은 이를 `작업 완료` 알림으로 처리했다. 또한 `tool.execute.after` 출력에 `Error` 또는 `failed` 같은 문자열이 포함되면 디버깅 중간 실패까지 macOS 알림으로 전송했다.

## Why
`session.idle`은 사용자에게 최종 결과를 알려도 되는 안정적인 완료 신호가 아니었다. tool 출력의 실패 문자열도 primary agent가 계속 복구 중인 중간 상태일 수 있어, 사용자 액션이 필요하지 않은 noise가 됐다.

## What Was Added To Harness
`plugin/auto-delegate/hooks/notify.ts`에서 `session.idle` 완료 알림을 제거했다. `tool.execute.after`의 일반 실패/리뷰 문자열 알림도 제거하고, 사용자 결정이 필요한 선택/차단, 승인 필요, `git push` 성공처럼 액션 가능성이 높은 알림만 유지했다. `tests/auto-delegate.test.mjs`에 idle 이벤트와 일반 tool 실패 출력이 알림을 만들지 않는 회귀 테스트를 추가했다.

## How To Verify
`npm test`를 실행한다. OpenCode 작업 중 tool 호출 사이에 `작업 완료` hook 알림이 반복되지 않아야 하며, 테스트 실패나 디버깅 중간 출력만으로 macOS 실패 알림이 오지 않아야 한다.

## Related
- `plugin/auto-delegate/hooks/notify.ts`
- `tests/auto-delegate.test.mjs`
