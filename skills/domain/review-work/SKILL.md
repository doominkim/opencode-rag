---
name: review-work
description: Bug-focused code review workflow for regressions, test gaps, and operational risks.
---

# Review Work

Use this skill when reviewing code, diffs, pull requests, or completed agent work.

## Review Priorities
- Correctness bugs
- Behavioral regressions
- Missing validation or authorization
- Migration and data compatibility risks
- Test gaps
- Operational edge cases
- Concurrency, retry, timeout, and failure-mode issues

## Rules
- Findings first, ordered by severity.
- Include file and line references where possible.
- Avoid broad style advice unless it creates a real defect.
- Do not trust subagent or tool self-reports without checking evidence.
- If no findings exist, state that explicitly and list residual risks.

## Output
- Findings
- Open questions
- Verification gaps
- Residual risks
