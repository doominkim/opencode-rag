# OpenCode Terminal Notifier Only

## What Failed

The notification harness still had an `osascript` fallback path, but the desired notification policy is to send OpenCode notifications only through `node-notifier`, which uses bundled `terminal-notifier` on macOS.

## Why

Multiple notification transports can make macOS notification permissions and debugging ambiguous. If fallback transport succeeds, failures in the intended `terminal-notifier` path can be hidden.

## What Was Added To Harness

- Removed the `osascript` transport from `plugin/auto-delegate/lib/notify.ts`.
- Kept `node-notifier` as the only notification transport.
- Kept timeout handling so a stuck `node-notifier` call does not block the hook indefinitely.
- Notification transport failures now log as `notify.failed` without fallback.

## How To Verify

- Run the OpenCode config verification command.
- Trigger a notification and confirm macOS shows it from `terminal-notifier`.
- If no notification appears, inspect macOS notification permissions for `terminal-notifier` and the OpenCode terminal app.

## Related

- User request: "osascript는 이제 안쓰고 node-notifier를 통해서 terminal-notifier만 쓸거야"
- File changed: `plugin/auto-delegate/lib/notify.ts`
