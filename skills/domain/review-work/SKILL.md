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
- For non-trivial reviews, split independent review lanes by area and validate candidate findings yourself.
- Add a critic pass for high-risk, cross-domain, or unexpectedly clean large reviews.
- Score each candidate finding from 0-100 and only report confidence >= 80 as a finding.
- If no findings exist, state that explicitly and list residual risks.

## Confidence Filtering
- 0-25: likely false positive or pre-existing issue.
- 26-50: possible issue but weak evidence or low impact.
- 51-75: valid concern but likely nitpick or rare edge case.
- 76-90: important issue likely to occur and worth fixing.
- 91-100: confirmed critical or important bug.

Keep 76-79 items in Open questions or Residual risks, not Findings.

## Output
- Findings
- Open questions
- Verification gaps
- Residual risks
