# Text Complete Hook Registration

## What Failed

The user reported that direct macOS notifications worked, but hook notifications no longer appeared after assistant responses.

## Why

`notifyOnTextComplete` existed in `plugin/auto-delegate/hooks/notify.ts`, but `plugin/auto-delegate/index.ts` did not register it under `experimental.text.complete`. As a result, event and tool hooks were invoked, but the final-response notification path never ran.

## What Was Added To Harness

`plugin/auto-delegate/index.ts` now imports `notifyOnTextComplete` and registers the `experimental.text.complete` hook to call it.

## How To Verify

- Restart OpenCode so the plugin is reloaded.
- Send a normal prompt and wait for the assistant response to finish.
- Check `logs/auto-delegate.jsonl` for `notify.text-complete.enter` and `notify.sent` records.
- Confirm a macOS notification with a `hook:` title appears.

## Related

- `plugin/auto-delegate/index.ts`
- `plugin/auto-delegate/hooks/notify.ts`
