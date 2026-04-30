# Fallback Notification Title Context

## What Failed
Fallback macOS notifications used only a generic status title like `fallback: 완료`, so the user could not tell which current task produced the notification.

## Why
Hook notifications can derive `sessionID`, but fallback notifications are direct terminal-notifier calls made by the assistant. The direct call did not encode the current task context in `-title`.

## What Was Added To Harness
`AGENTS.md` now requires fallback notification titles to use only the visible OpenCode renamed session name when available. If the renamed session name is not visible, fallback titles must not infer task names and should use a generic status-only title like `fallback: 완료`.

## How To Verify
Check final-response fallback notifier calls. The title should be only the visible renamed session name when available. If unavailable, it should be a generic status-only fallback title.

## Related
- `AGENTS.md`
