---
name: git-master
description: Git history, diff review, branch hygiene, and commit-message assistance.
---

# Git Master

Use this skill for git status inspection, commit message drafting, history lookup, blame, bisect planning, and branch hygiene.

## Rules
- Never commit, amend, rebase, push, or force-push without explicit user approval.
- Never revert or discard user changes unless explicitly requested.
- Always inspect `git status` before recommending commit boundaries.
- Prefer small, atomic commits when the user asks for commits.
- Match the repository's existing commit language and style when drafting messages.

## Workflow
1. Inspect `git status`.
2. Inspect changed files or diffs relevant to the requested git operation.
3. Separate unrelated changes and mention them clearly.
4. Draft commit boundaries or messages without executing commit commands unless approved.
5. For history questions, use read-only commands such as `git log`, `git blame`, or `git log -S`.

## Output
- Current git state
- Relevant files
- Recommended commit split or message
- Commands run
- Risks or user decisions needed
