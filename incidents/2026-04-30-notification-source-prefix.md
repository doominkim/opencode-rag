# Notification Source Prefix

## What Failed
Hook notifications and fallback notifications could both use only the renamed OpenCode session title. When both paths emitted notifications, the user could not tell whether a notification came from the hook path or the direct fallback path.

## Why
The hook title helper returned the renamed session title without a `hook:` prefix. The fallback policy in `AGENTS.md` also said to use only the renamed session title when visible, which intentionally removed the source marker.

## What Was Added To Harness
- Hook notifications now keep the `hook:` prefix even when using a renamed session title.
- Fallback notification policy now requires a `fallback:` prefix even when a renamed session title is visible.
- The notification title regression test was updated to verify the `hook:` prefix is preserved.

## How To Verify
Run `npm test` and confirm `notify hook uses renamed session title when available` expects `hook: <session title>`.

## Related
- `AGENTS.md`
- `plugin/auto-delegate/hooks/notify.ts`
- `tests/auto-delegate.test.mjs`
