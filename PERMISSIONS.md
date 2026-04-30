# PERMISSIONS.md

This file defines how agents and hooks must use the shared permission policy.

## Source Of Truth

The canonical permission rules live in:

```text
/Users/dominic/.config/opencode/plugin/auto-delegate/lib/permissions.ts
```

All agents must check this global OpenCode `PERMISSIONS.md` first, then inspect `PERMISSION_RULES` in `/Users/dominic/.config/opencode/plugin/auto-delegate/lib/permissions.ts` before running `bash`, `shell`, git commands, file deletion/move commands, RAG sync/ingest/bootstrap commands, DB commands, or external-system changes.

`PERMISSIONS.md` must not duplicate the full rule table. It points agents to the same data structure that hooks use.

## Rule Shape

```ts
{
  id: "stable-rule-id",
  scope: "bash | git | filesystem | rag | db | network | agent",
  match: "human-readable command/action pattern",
  action: "ask | deny",
  re: /optional-runtime-detection-regex/,
  reason: "why this rule exists",
}
```

## Enforcement Model

Every row in `PERMISSION_RULES` is a restricted rule. Do not add rows for allowed/read-only behavior unless there is a concrete guard to enforce.

Rules with `action: "ask"` and `re` are automatically converted into `DESTRUCTIVE_PATTERNS` by `plugin/auto-delegate/lib/patterns.ts` and enforced by `plugin/auto-delegate/hooks/permission-gate.ts`.

Rules with `action: "deny"` must be followed by agents even when they cannot be fully enforced by regex.

## Approval Protocol

Before running any rule with `action: "ask"`, the agent must provide the exact command, affected paths/refs/systems, whether data or user work can be lost, and wait for explicit user approval.

## Policy Change Protocol

When changing permissions, update `plugin/auto-delegate/lib/permissions.ts` first. Do not add separate policy rows to `PERMISSIONS.md` or `patterns.ts`.

After changing `PERMISSION_RULES`, run `npm test`.
