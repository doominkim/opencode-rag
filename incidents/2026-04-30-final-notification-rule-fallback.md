# Final Notification Rule Fallback

## What Failed

Direct macOS notification calls worked, but real responses did not trigger notifications through the OpenCode plugin hook path. Entry logging also did not create `logs/auto-delegate.jsonl`, indicating that the current execution path did not invoke the plugin hooks.

## Why

Hook-based completion notifications depend on OpenCode runtime plugin dispatch. In this session, that dispatch path was not observable, so `experimental.text.complete` could not be relied on to notify after final responses.

## What Was Added To Harness

- Added an `AGENTS.md` communication rule requiring a direct `terminal-notifier` call immediately before final responses.
- Kept hook-based notification code as the preferred runtime mechanism when plugin dispatch works.
- Explicitly made notification command failure non-blocking for final responses.
- Refined the fallback rule to use dynamic `-subtitle`, `-message`, and success/failure sounds instead of a fixed generic completion notification.
- Aligned fallback notification copy with the existing hook policy: `title=상태`, `subtitle=맥락`, `message/body=실제 내용`.
- Added source prefixes to notification titles so fallback and hook notifications can be distinguished: `fallback: ...` and `hook: ...`.

## How To Verify

- Trigger any final assistant response.
- Confirm a macOS notification appears before the response is finalized.
- If the command fails, the assistant should still provide the final response.

## Related

- User report: "알람 안왔는데"
- Files changed: `AGENTS.md`
