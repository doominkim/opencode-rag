---
description: Review current changes for bugs, regressions, and operational risks.
---

# Review Workflow

Use this command for code review, regression risk review, or implementation quality review.

The primary agent coordinates the review. Do not bind this command to a single reviewer agent, because non-trivial reviews need multiple independent passes and primary-agent validation before presenting findings.

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
5. For high-risk or cross-domain changes, add a critic pass that assumes the initial review may have missed edge cases.
6. Score each candidate finding for confidence from 0-100 and filter out anything below 80 unless it belongs in Open questions or Residual risks.
7. Validate delegated findings against the actual files before presenting them.

## Multi-Agent Review Pattern
- Small multi-file change: use 1 reviewer or direct review if the scope is obvious.
- Medium cross-file change: use 2-3 independent reviewer calls split by affected area.
- Large or high-risk change: use 4-6 independent reviewer calls plus one critic pass.
- Do not use the same agent lane for implementation and final approval.
- Merge duplicate findings and discard weak or speculative findings.

## Critic Pass Prompt
```text
CONTEXT:
[Initial review summary, changed files, high-risk assumptions]

TASK:
Assume the initial review may be wrong or incomplete. Look for missed correctness bugs, regressions, edge cases, migration/deployment risks, and broken assumptions.

MUST DO:
1. Focus only on issues with operational or user-visible impact.
2. Provide file/line evidence.
3. Score confidence from 0-100.

MUST NOT DO:
- Do not provide style or preference feedback.
- Do not repeat already validated findings unless adding new evidence.
- Do not report confidence below 80 as a finding.

OUTPUT FORMAT:
- Findings
- False-positive concerns
- Residual risks
```

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
