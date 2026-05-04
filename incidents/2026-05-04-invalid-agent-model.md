# Invalid Agent Model

## What Failed
`/commit` 명령 실행 시 `Model not found: openai/gpt-5.3-codex-spark` 오류가 발생했다.

추가 확인 결과 `agent/commit-message.md`뿐 아니라 `agent/architect.md`도 `openai/gpt-5.3-*` 계열 모델을 참조하고 있었다.

## Why
agent frontmatter에 provider가 더 이상 제공하지 않는 모델 ID가 남아 있었다. `/commit` command는 `agent: commit-message`에 직접 바인딩되어 있어 agent model 로딩 실패가 command 실패로 바로 이어졌다.

## What Was Added To Harness
- `agent/commit-message.md` 모델을 빠른 응답 계열로 교체했다.
- `agent/architect.md` 모델을 설계/리뷰 계열로 교체했다.
- 전체 agent/preset 모델 라인업을 다음 정책으로 정리했다.
  - 설계/리뷰/분석 계열: `openai/gpt-5.5-fast`
  - 구현 계열: `openai/gpt-5.4-fast`
  - 빠른 응답 계열: `openai/gpt-5.4-mini-fast`
  - 대량 반복 계열: `openai/gpt-5.4-nano-fast`
- `command/commit.md`에서 직접 agent 바인딩을 제거해, subagent 모델 문제가 생기면 primary agent가 동일 규칙으로 fallback할 수 있게 했다.

## How To Verify
- `rg -n "gpt-5\.3|codex-spark|5\.3-spark" agent command skills/_presets -g "*.md"` 결과가 없어야 한다.
- `rg -n "^model:" agent skills/_presets -g "*.md"`로 모델 라인업을 확인한다.
- `/commit`을 실행했을 때 `Model not found: openai/gpt-5.3-codex-spark`가 재발하지 않아야 한다.

## Related
- `agent/commit-message.md`
- `agent/architect.md`
- `command/commit.md`
- `skills/_presets/`
