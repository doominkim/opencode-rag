# Hook Only Notifications

## What Failed

Notification behavior had two paths: OpenCode hook notifications and direct assistant-triggered macOS notifications before final responses. The direct path made notification behavior harder to reason about and was no longer desired.

## Why

The assistant instruction still required a direct notification command before final responses, and `notify.ts` still retried `node-notifier` failures through a direct `terminal-notifier` execution path.

## What Was Added To Harness

- Removed the final-response direct notification rule from `AGENTS.md`.
- Removed direct `terminal-notifier` retry logic from `plugin/auto-delegate/lib/notify.ts`.
- Updated tests to assert that the direct notification retry path is absent.

## How To Verify

- Run `npm test`.
- Search `AGENTS.md`, `plugin/auto-delegate`, and `tests` for direct notification retry strings.
- Confirm notifications are emitted only through registered OpenCode hooks.

## Related

- `AGENTS.md`
- `plugin/auto-delegate/lib/notify.ts`
- `tests/auto-delegate.test.mjs`
