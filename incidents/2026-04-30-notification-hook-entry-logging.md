# Notification Hook Entry Logging

## What Failed

The user reported that direct notification calls worked, but notifications were not emitted after real OpenCode work. This narrowed the failure away from macOS notification transport and toward OpenCode hook invocation or hook input handling.

## Why

The notification hook only logged successful sends and failures inside notification transport. If `tool.execute.after`, `experimental.text.complete`, `event`, or `permission.ask` did not call the notification hook, there was no durable evidence showing whether the hook was not invoked or invoked with an unexpected input/output shape.

## What Was Added To Harness

- Added entry logging for `notifyOnEvent`.
- Added entry logging for `notifyOnToolAfter`, including tool, session, call ID, args, output keys, and output preview.
- Added entry logging for `notifyOnTextComplete`, including session/message/part IDs and text preview.
- Added entry logging for `notifyOnPermissionAsk`, including status and input keys.

## How To Verify

- Run `npm test`.
- Perform a real OpenCode task that uses tools or returns a final answer.
- Inspect `logs/auto-delegate.jsonl` for `notify.*.enter` records.
- If entry records are absent, plugin lifecycle/loading or OpenCode hook dispatch is the issue.
- If entry records are present but no notification is sent, compare `args`, `outputKeys`, and previews against notification matching logic.

## Related

- User report: "직접 호출 시엔 잘되는거 같지만 실제 작업 후에 hook을 통한 호출이 제대로 이뤄지지않고 있는거같아"
- Files changed: `plugin/auto-delegate/hooks/notify.ts`
