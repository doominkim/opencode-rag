# Auto Delegate Plugin Resolution Failure

## What Failed

`opencode.json`에는 `auto-delegate` plugin이 등록되어 있었지만 루트 `package.json`에는 해당 package가 dependency로 연결되어 있지 않았다.

검증에서 다음이 실패했다.

```bash
npm ls auto-delegate --depth=0
node --input-type=module -e "import('auto-delegate')"
```

## Why

OpenCode config는 plugin 이름을 보고 module resolution을 수행한다. `auto-delegate`가 로컬 디렉터리에는 있었지만 package dependency로 연결되지 않아 runtime에서 module not found가 발생할 수 있었다.

## What Was Added To Harness

- 루트 `package.json`에 `"auto-delegate": "file:plugin/auto-delegate"` 추가
- `plugin/auto-delegate/package.json` 추가
- `package-lock.json` 갱신
- `scripts/verify.mjs`에 `npm ls auto-delegate --depth=0`와 `import.meta.resolve('auto-delegate')` smoke check 추가

## How To Verify

```bash
npm ls auto-delegate --depth=0
node --input-type=module -e "console.log(import.meta.resolve('auto-delegate'))"
npm run verify
```

`import.meta.resolve`는 `plugin/auto-delegate/index.ts` 경로를 출력해야 한다.

## Related

- Fix commit: `05dbb30`
- Files: `opencode.json`, `package.json`, `package-lock.json`, `plugin/auto-delegate/package.json`, `scripts/verify.mjs`
