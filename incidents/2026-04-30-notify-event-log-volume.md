# Notify Event Log Volume

## What Failed
`logs/auto-delegate.jsonl` became noisy because the notify hook logged every event, including high-frequency streaming events like `message.part.updated`.

## Why
The hook entry log was added for diagnostics but did not filter event types. OpenCode emits many message and part update events during a single response.

## What Was Added To Harness
Notify event entry logging is now limited to low-volume events relevant to notification behavior: `session.idle`, `session.updated`, and `session.error`.

## How To Verify
Run a normal prompt and inspect `logs/auto-delegate.jsonl`. It should not be flooded with `message.part.updated` entries from the notify hook.

## Related
- `plugin/auto-delegate/hooks/notify.ts`
