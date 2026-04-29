# Permission Gate Input Shape Failure

## What Failed

`permission.ask` hook이 destructive bash command를 막아야 했지만, 입력 shape를 `input.command` 또는 `input.args.command`로만 가정했다. SDK의 actual permission shape는 `pattern`, `patterns`, `metadata`에 command 후보가 들어올 수 있어 gate가 no-op 될 가능성이 있었다.

## Why

OpenCode SDK 버전별 permission request 구조가 다르다.

- v1 shape: `type`, `pattern`, `metadata`
- v2 shape: `permission`, `patterns`, `metadata`, `tool`

hook이 한 가지 shape만 가정하면 destructive command detection이 빠질 수 있다.

## What Was Added To Harness

- `plugin/auto-delegate/hooks/permission-gate.ts`에 `permissionCommandCandidates()` 추가
- SDK v1/v2 후보 필드(`pattern`, `patterns`, `metadata.command`, `metadata.patterns`)를 모두 검사
- non-bash permission의 파일 경로를 destructive command로 오탐하지 않도록 `isBashPermission()` 추가
- `tests/auto-delegate.test.mjs`에 permission shape 테스트 추가

## How To Verify

```bash
npm run verify:plugin
```

테스트는 다음 케이스를 통과해야 한다.

- v1 `pattern` 기반 destructive command 감지
- v2 `patterns` 기반 destructive command 감지
- `metadata.command` 기반 destructive command 감지
- non-bash `read` permission pattern은 무시

## Related

- Fix commit: `05dbb30`
- Files: `plugin/auto-delegate/hooks/permission-gate.ts`, `tests/auto-delegate.test.mjs`
