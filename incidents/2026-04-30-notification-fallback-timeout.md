# OpenCode Notification Fallback Timeout

## What Failed

The user reported that an OpenCode notification test did not appear. Direct testing showed `node-notifier` could hang without invoking its callback, while the notification hook awaited that callback indefinitely.

## Why

`notifyWithNodeNotifier` wrapped `node-notifier.notify` in a Promise with no timeout. If the bundled `terminal-notifier` process returned without producing a callback or became stuck in the Node wrapper path, `notify()` could block the hook and fail to log a final result.

## What Was Added To Harness

- Added a 2 second timeout around the `node-notifier` Promise.
- On timeout, the notification attempt is rejected instead of waiting indefinitely.
- The warning log path records the timeout as `notify.failed`.

## How To Verify

- Run the OpenCode config verification command.
- Trigger a notification in an environment where `node-notifier` does not call back and confirm the hook returns after the timeout.
- Confirm `logs/latest-notification.md` is still written before transport selection.

## Related

- User report: "알림이 안오는데"
- File changed: `plugin/auto-delegate/lib/notify.ts`
