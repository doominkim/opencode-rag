# Chat Message SessionID

## What Failed
사용자 prompt에 `fallback` 같은 키워드가 들어가 router가 매치하면 OpenCode가 `SyncEvent.run: "sessionID" required but not found` 에러를 던지며 응답이 진행되지 않았다. 에러 payload에 노출된 part 텍스트는 `[auto-delegate] 위임 후보(MEDIUM) — general-purpose 검토 권고...`로 시작했고, 이는 `userPrompt` hook이 추가하던 부분과 동일했다.

## Why
`userPrompt`(`chat.message`) hook이 `parts.push({ type: "text", text: ... })`로 새 part를 user message에 추가했다. OpenCode 1.14.22는 plugin이 추가한 part를 SyncEvent로 publish할 때 `sessionID/messageID/partID`를 검증하는데, push된 객체에는 이 메타데이터가 없어 validator가 reject했다. 이는 이전 `experimental.text.complete` 회귀(`2026-04-30-text-complete-sessionid.md`)와 동일한 메커니즘이다. `chat.message`는 plugin의 핵심 라우팅 hook이라 hook 자체를 제거할 수는 없다.

## What Was Added To Harness
`plugin/auto-delegate/hooks/user-prompt.ts`에서 신규 part push 대신 기존 첫 text part에 텍스트를 append하는 `appendToFirstTextPart` 헬퍼를 도입했다. 라우팅 권고 주입과 resume reminder 주입 두 경로 모두 이 헬퍼를 거치도록 변경. 기존 part는 OpenCode가 이미 메타데이터를 채워둔 상태라 SyncEvent 검증을 통과한다.

## How To Verify
OpenCode를 재시작하고 `fallback` 같은 router trigger 키워드가 포함된 prompt를 보낸다. `SyncEvent.run: "sessionID" required but not found` 에러가 더 이상 발생하지 않고, `[auto-delegate] 위임 후보` 텍스트가 응답 직전 user prompt 끝에 자연스럽게 합쳐져 표시되어야 한다.

## Related
- `plugin/auto-delegate/hooks/user-prompt.ts`
- `incidents/2026-04-30-text-complete-sessionid.md`
