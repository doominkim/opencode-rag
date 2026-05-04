# Review Quality Gap

## What Failed
OpenCode 리뷰 결과가 Claude Code 쪽 리뷰보다 약하게 느껴진다는 사용자 보고가 있었다.

비교 결과 OpenCode reviewer는 더 작은 모델을 사용했고, `/review-work` command가 단일 reviewer agent에 고정되어 있었다. 또한 Claude 쪽 전역 정책에 있던 critic pass, self-approval 금지, confidence filtering, 병렬 리뷰 수 가이드가 OpenCode `AGENTS.md`에는 충분히 반영되어 있지 않았다.

## Why
리뷰 품질은 단일 pass보다 독립 검토와 false-positive 필터링에 의존한다. OpenCode 설정은 reviewer prompt 자체는 유사했지만 다음 품질 게이트가 약했다.

- reviewer model이 `openai/gpt-5.4-mini`였다.
- `/review-work`가 command frontmatter에서 `agent: reviewer`로 고정되어 primary-agent orchestration 여지가 작았다.
- 큰 변경에서 critic pass와 다중 reviewer 호출을 강제하는 전역 규칙이 누락되어 있었다.
- confidence 80 미만 finding을 최종 결과에서 제외하는 정책이 reviewer/skill/command에 일관되게 명시되지 않았다.

## What Was Added To Harness
- `agent/reviewer.md`의 model을 `openai/gpt-5.5`로 올렸다.
- reviewer finding에 confidence score를 요구하고, 80 미만 항목은 final finding에서 제외하도록 명시했다.
- `command/review-work.md`에서 단일 `agent: reviewer` 고정을 제거하고 primary-agent orchestration 방식으로 바꿨다.
- `/review-work`에 multi-agent review pattern, critic pass prompt, confidence filtering을 추가했다.
- `AGENTS.md`에 Review Quality Gate, 병렬 리뷰 수 가이드, critic pass, confidence scoring, 검증 실패 재시도, self-approval 금지 정책을 추가했다.
- `skills/domain/review-work/SKILL.md`에도 confidence filtering과 critic pass 규칙을 추가했다.

## How To Verify
- `agent/reviewer.md` frontmatter의 model이 `openai/gpt-5.5`인지 확인한다.
- `command/review-work.md` frontmatter에 `agent: reviewer`가 없는지 확인한다.
- `AGENTS.md`에 `Review Quality Gate`, `Critic Pass`, `Self-approval 금지` 섹션이 있는지 확인한다.
- Markdown fenced code block이 닫혀 있고 이후 섹션이 코드 블록에 흡수되지 않았는지 확인한다.

## Related
- `AGENTS.md`
- `agent/reviewer.md`
- `command/review-work.md`
- `skills/domain/review-work/SKILL.md`
