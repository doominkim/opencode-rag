# OpenCode Notification Hooks

## What Failed

Long-running OpenCode work could finish, block on a decision, or require destructive-command approval without an OS-level signal. The user had to keep watching the terminal/chat to know whether action was needed.

## Why

The existing `auto-delegate` plugin logged events and enforced destructive-command approval, but it did not surface state changes through macOS notifications.

## What Was Added To Harness

- Added `plugin/auto-delegate/lib/notify.ts` for macOS notifications through `node-notifier`.
- Added local `node-notifier` dependency so notifications use the bundled `terminal-notifier` on macOS.
- Added OpenCode notification assets (`assets/opencode.svg`, generated `assets/opencode.png`) and wired the PNG as the `node-notifier` icon.
- Added detailed notification context file at `logs/latest-notification.md` and wired `node-notifier.open` so clicking a notification can open the detailed context.
- Improved alert body text to include the matched output excerpt for choice/blocked/failed/review categories.
- Increased notification body limit from 180 to 600 chars, added `subtitle`, and included up to four relevant output lines in alert bodies.
- Standardized notification copy so title carries status, subtitle carries context, and message starts immediately with the actionable content.
- Added `plugin/auto-delegate/hooks/notify.ts` for categorized notifications:
  - completed: `session.idle`
  - choice required: tool output contains interview/decision markers
  - blocked: tool output contains blocked markers
  - failed: tool output contains failure markers
  - review required: tool output contains review markers
  - approval required: `permission.ask` with `status = ask`
- Wired notification hooks into `plugin/auto-delegate/index.ts`.

## How To Verify

- Run TypeScript syntax/load checks for the plugin files.
- Trigger a test notification with `node-notifier` on macOS and verify the bundled `terminal-notifier` sends it.
- Trigger a test notification with the OpenCode icon path and verify the icon is accepted by `node-notifier`/terminal-notifier.
- Trigger a notification with `open` and verify `logs/latest-notification.md` is written.
- Observe that `.config/opencode/logs/auto-delegate.jsonl` records `notify.sent` when notifications are emitted.

## Related

- User request: add dynamic notifications for OpenCode outcomes and states requiring user attention.
