# Input Turn Notification

## What Failed
The user had no hook notification when an assistant turn finished and OpenCode was waiting for user input.

## Why
The notification hook intentionally ignored broad idle events to avoid noisy mid-work alerts, but did not use the newer `session.status` `busy`/`idle` transition as a narrower signal for user input readiness.

## What Was Added To Harness
The notification hook now schedules an `input_required` notification when a session transitions from `busy` to `idle`. The notification is delayed briefly and cancelled if the session becomes `busy` again, avoiding false positives from transient idle events.

## How To Verify
Run `npm test` and confirm tests cover both the delayed idle notification and cancellation when `busy` follows `idle`.

## Related
- `plugin/auto-delegate/hooks/notify.ts`
- `plugin/auto-delegate/lib/notify.ts`
- `tests/auto-delegate.test.mjs`
