# Notification Hook Prefix

## What Failed
macOS notification titles exposed the internal `hook:` prefix even when the user wanted user-facing session or status titles only.

## Why
The communication policy required hook notifications to keep a `hook` source marker, and the notification hook also injected `hook:` in generated titles and default title fallbacks.

## What Was Added To Harness
Updated the communication policy, notification title generation, and notification hook test expectation so hook notifications still flow only through OpenCode hooks, but user-visible titles no longer include the `hook:` prefix.

## How To Verify
Read `AGENTS.md`, `plugin/auto-delegate/hooks/notify.ts`, and `plugin/auto-delegate/lib/notify.ts` and confirm notification titles use session/status text without `hook:`.

## Related
- `AGENTS.md`
- `plugin/auto-delegate/hooks/notify.ts`
- `plugin/auto-delegate/lib/notify.ts`
- `tests/auto-delegate.test.mjs`
