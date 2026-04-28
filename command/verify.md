---
description: Run focused non-destructive verification.
agent: verifier
---

# Verification Workflow

Use this command after implementation or when the user asks whether the current state passes checks.

## Rules
- Verification commands must be non-destructive.
- Prefer repo-native scripts from `package.json`, `Makefile`, or documented commands.
- Do not run deploy, migration, bootstrap, sync, or destructive cleanup commands without explicit approval.
- This command runs with the `verifier` agent.

## Workflow
1. Inspect available scripts and docs.
2. Pick the smallest relevant check first.
3. Run non-destructive checks.
4. Report exact command results.
5. If a check fails, summarize root cause and next fix.

## Safe Command Examples
```bash
npm test
npm run test
npm run lint
npm run build
npx tsc --noEmit
```

## Verification Prompt Template
```text
CONTEXT:
[What changed and what needs verification]

TASK:
Run focused non-destructive verification and report results.

MUST DO:
1. Inspect repo scripts before choosing commands.
2. Run only non-destructive checks.
3. Return exact commands and pass/fail status.

MUST NOT DO:
- Do not run migrations, deploys, syncs, bootstraps, or destructive commands.
- Do not modify files.

VERIFY:
- Use command exit status and output.

OUTPUT FORMAT:
- Commands run
- Results
- Failures and likely cause
```
