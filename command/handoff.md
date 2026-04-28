---
description: Summarize current work for another agent or future session.
agent: build
---

# Handoff Workflow

Use this command to summarize current work for another agent, future session, or human reviewer.

## Rules
- Be factual and concise.
- Separate completed work, pending work, blockers, and verification status.
- Include relevant files and commands.
- Do not claim tests passed unless they were actually run.

## Workflow
1. Inspect current task context and changed files when available.
2. Summarize decisions and rationale.
3. List remaining work in execution order.
4. Include verification commands already run and their results.
5. Include risks or assumptions.

## Output Format
- Goal
- Completed
- Changed files
- Verification
- Pending work
- Risks / assumptions
- Suggested next command
