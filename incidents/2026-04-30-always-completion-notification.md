# Always Completion Notification

## What Failed

Completion notifications depended on specific final-response phrases such as `완료했습니다` or `푸시 완료`. Real work could finish successfully without those exact markers, so no notification was emitted even though notification transport itself worked.

## Why

The notification hook treated final assistant text as a marker-matched signal instead of a lifecycle signal. This made completion notifications indirectly dependent on agent wording.

## What Was Added To Harness

- Changed `notifyOnTextComplete` to send a `completed` notification for any non-empty final text.
- Kept the existing guard that ignores injected task-template text.
- Kept per-message throttling through `once(...)` to avoid duplicate notifications for the same message.
- Added a regression test that verifies arbitrary final text emits a completion notification.

## How To Verify

- Run `npm test`.
- Run `npm run verify`.
- Complete any normal OpenCode response and confirm a completion notification is emitted.

## Related

- User request: "알림 조건을 그냥 항상으로 하는 형태로 가자"
- Files changed: `plugin/auto-delegate/hooks/notify.ts`, `tests/auto-delegate.test.mjs`
