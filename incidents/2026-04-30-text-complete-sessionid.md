# Text Complete SessionID

## What Failed
OpenCode reported `SyncEvent.run: "sessionID" required but not found` during assistant output and subagent/tool flows.

## Why
The local plugin registered `experimental.text.complete`. In the current runtime path, that hook can be invoked with a payload shaped like `{ part: ... }` instead of the SDK type shape containing `sessionID`, `messageID`, and `partID`. OpenCode validates the sync event before plugin recovery logic can run, so optional chaining inside `notifyOnTextComplete` is not enough.

## What Was Added To Harness
The plugin no longer registers `experimental.text.complete`. Completion notifications remain covered by the existing `event` hook via `session.idle`, and tool/permission notification hooks remain registered.

## How To Verify
Restart OpenCode and run a normal prompt or Task call. The output should no longer show `SyncEvent.run: "sessionID" required but not found`.

## Related
- `plugin/auto-delegate/index.ts`
- `plugin/auto-delegate/hooks/notify.ts`
