# Preset maxOutputTokens Removal

## What Failed
OpenCode primary가 subagent로 위임할 때마다 LLM API가 `Bad Request: {"detail":"Unsupported parameter: max_output_tokens"}`로 거절했다. 모든 카테고리 위임이 막혀 auto-delegate 흐름 전체가 차단됐다.

## Why
`plugin/auto-delegate/hooks/chat-params.ts`가 agent별 preset에서 `output.maxOutputTokens`를 강제로 주입하고 있었다. OpenCode → AI SDK → OpenAI provider 경로에서 camelCase `maxOutputTokens`가 snake_case `max_output_tokens`로 직렬화되어 OpenAI Chat Completions로 전송된다. 그런데 Chat Completions는 `max_tokens`(legacy) 또는 `max_completion_tokens`(reasoning)만 받고 `max_output_tokens`는 Responses API 전용이라 400 reject한다.

사용자는 `skills/_presets/*.md` frontmatter의 `max_tokens` 라인을 지우면 해결될 것으로 기대했지만, 그 frontmatter는 사람용 참조 문서일 뿐이고 실제 런타임 값은 `plugin/auto-delegate/lib/presets.ts`의 TypeScript `PRESETS` 상수에서 온다. 두 출처 사이의 불일치가 "분명 지웠는데 안 고쳐진" 오해의 원인이다.

## What Was Added To Harness
- `plugin/auto-delegate/lib/presets.ts` — `PRESETS` 4개 항목에서 `maxOutputTokens` 키 제거. `temperature`만 남김.
- `plugin/auto-delegate/hooks/chat-params.ts` — `output.maxOutputTokens` override 및 로깅 라인 제거. `temperature` 흐름만 유지.
- `README.md` / `skills/README.md` — preset 설명에서 `max_tokens` 표기 제거. plugin 동작 표에 본 incident 참조 링크 추가.

## How To Verify
1. `rg -n "max[_]?[Oo]utput[_]?[Tt]okens" /Users/dominic/.config/opencode` 결과가 본 incident 파일과 README의 의도된 언급(불가능 항목 설명)에 한정되는지 확인.
2. `node --check plugin/auto-delegate/hooks/chat-params.ts` 와 `lib/presets.ts` 로 syntax 검증.
3. `npm run verify:plugin` (`node --test tests/*.test.mjs`) 통과.
4. 새 OpenCode 세션에서 임의 subagent 위임을 한 번 호출하여 `Unsupported parameter` 에러가 재현되지 않는지 확인. plugin 로그에서 `chat-params.preset-applied` 이벤트 페이로드에 `maxOutputTokens` 키가 사라졌는지 확인.

## Related
- `/Users/dominic/.config/opencode/plugin/auto-delegate/hooks/chat-params.ts`
- `/Users/dominic/.config/opencode/plugin/auto-delegate/lib/presets.ts`
- `/Users/dominic/.config/opencode/skills/_presets/` (frontmatter `max_tokens` 라인은 사용자가 선제적으로 제거)
- `/Users/dominic/.claude/plans/bad-request-detail-unsupported-parameter-lucky-chipmunk.md`
