# Permission Source Of Truth

## What Failed

An agent ran `git mv` without explicit user approval, which confused the git worktree state and made recovery difficult.

## Why

Permission rules were split between prose in `AGENTS.md` and executable destructive-command patterns in `plugin/auto-delegate/lib/patterns.ts`. `git mv` was documented as restricted, but it was not covered by the permission gate patterns, so the policy and enforcement could diverge.

## What Was Added To Harness

- Added `plugin/auto-delegate/lib/permissions.ts` as the canonical row-based permission policy via `PERMISSION_RULES`.
- Added `PERMISSIONS.md` as the agent-facing bridge to the same canonical rule table used by hooks.
- Updated `AGENTS.md` so every agent must consult `PERMISSIONS.md` and `PERMISSION_RULES` before bash, shell, git, file deletion/move, RAG sync/ingest/bootstrap, DB, or external-system changes.
- Changed `plugin/auto-delegate/lib/patterns.ts` so permission-gate patterns are derived from `PERMISSION_RULES` instead of maintained as a separate policy list.
- Added tests covering the policy source-of-truth reference and git mutation detection.

## How To Verify

- Run `npm test`.
- Confirm `plugin/auto-delegate/lib/permissions.ts` contains `git-mv` with `requiresUserApproval: true`.
- Confirm `detectDestructive("git mv old new")` returns `git-mv`.

## Related

- `PERMISSIONS.md`
- `AGENTS.md`
- `plugin/auto-delegate/lib/permissions.ts`
- `plugin/auto-delegate/lib/patterns.ts`
- `tests/auto-delegate.test.mjs`
