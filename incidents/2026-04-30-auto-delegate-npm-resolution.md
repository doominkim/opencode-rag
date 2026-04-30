# Auto Delegate NPM Resolution

## What Failed
OpenCode hooks from `auto-delegate` did not run. Runtime logs showed `Plugin export is not a function` while loading `auto-delegate`.

## Why
The config used the bare npm-style plugin name `auto-delegate`. OpenCode resolved it as an npm package and installed `auto-delegate@latest` into its cache instead of loading the local plugin implementation in `plugin/auto-delegate`.

## What Was Added To Harness
`opencode.json` no longer lists the bare `auto-delegate` npm plugin. A local plugin wrapper was added under `plugins/auto-delegate.ts`, which is the documented local plugin directory OpenCode auto-loads at startup.

## How To Verify
Restart OpenCode and check `~/.local/share/opencode/log/*.log`. The logs should no longer show `path=auto-delegate error=Plugin export is not a function`, and `logs/auto-delegate.jsonl` should contain `plugin.init` after startup.

## Related
- `opencode.json`
- `plugins/auto-delegate.ts`
