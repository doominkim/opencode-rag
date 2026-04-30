# Final Response Completion Notification

## What Failed

After a commit and push completed successfully, no completion notification was sent. The user expected that kind of terminal task result to count as a completed OpenCode task.

## Why

The notification hook only watched `session.idle`, selected tool outputs, and permission prompts. A successful task that was summarized in the final assistant message did not necessarily emit a matching tool output or idle event notification.

## What Was Added To Harness

- Added `notifyOnTextComplete` to inspect assistant final message text through `experimental.text.complete`.
- Completion notifications now trigger for explicit completion phrases such as `완료했습니다`, `푸시 완료`, and `커밋하고 push 완료`.
- The completion title remains `완료`, the subtitle carries context such as `커밋/푸시`, and the body carries the actual final response excerpt.
- User prompt injection text is ignored to avoid false positives from routing reminders.
- A previous attempt used `chat.message`, but that hook is for new user messages and does not reliably see assistant final text.

## How To Verify

- Run the OpenCode config verification command.
- Complete a commit/push task and confirm the final assistant response emits a `완료` notification.
- Ask a simple question like `1+1` and confirm it does not emit a completion notification.

## Related

- User report: "커밋 푸시 완료는 작업완료로 안쳐? 왜 알람 안줬어"
- Files changed: `plugin/auto-delegate/hooks/notify.ts`, `plugin/auto-delegate/index.ts`
