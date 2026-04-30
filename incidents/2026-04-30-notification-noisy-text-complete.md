# Noisy Text Complete Notifications

## What Failed

Hook notifications fired too often because every assistant final text completion produced a macOS notification.

## Why

`experimental.text.complete` was registered to call `notifyOnTextComplete`, and `notifyOnTextComplete` sent a `completed` notification for ordinary final responses.

## What Was Added To Harness

- Removed `experimental.text.complete` notification registration from `plugin/auto-delegate/index.ts`.
- Changed `notifyOnTextComplete` to log only and never send user-visible notifications.
- Updated tests so final text completion must not emit notifications.

## How To Verify

- Run `npm test`.
- Send an ordinary prompt and confirm no completion notification appears.
- Trigger a command that requires permission approval and confirm the approval notification still appears.

## Related

- `plugin/auto-delegate/index.ts`
- `plugin/auto-delegate/hooks/notify.ts`
- `tests/auto-delegate.test.mjs`
