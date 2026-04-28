---
description: Review current changes for bugs, regressions, and operational risks.
agent: reviewer
---

# Review Workflow

Use this command for code review, regression risk review, or implementation quality review.

## Rules
- Findings first, ordered by severity.
- Focus on bugs, regressions, migration risks, test gaps, operational edge cases.
- Do not rewrite code during review unless the user asks for fixes.
- Do not trust self-reported success; inspect the diff or files directly.

## Workflow
1. Inspect `git status` and relevant diffs/files.
2. Identify changed behavior and affected boundaries.
3. Check tests or verification coverage.
4. For non-trivial changes, split the review by affected area and apply the reviewer agent's parallel review policy.
5. Validate any delegated findings against the actual files before presenting them.

## Area Review Prompt Template
```text
CONTEXT:
[What changed, relevant files, intended behavior]

TASK:
Review for bugs, regressions, migration risks, missing tests, and operational edge cases.

MUST DO:
1. Prioritize concrete issues with file/line references.
2. Explain the user-visible or operational impact.
3. Mention tests that should exist or be run.

MUST NOT DO:
- Do not provide broad style advice unless it hides a bug.
- Do not approve based only on self-report.

VERIFY:
- Check changed files/diffs directly.

OUTPUT FORMAT:
- Findings
- Open questions
- Residual risks
```

## Final Output
- Findings
- Open questions
- Verification gaps
- Brief summary only after findings
