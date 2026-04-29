# add_memory --no-sync Gate Bypass

## What Failed

`rag/scripts/add_memory.py --no-sync`는 RAG DB sync를 실행하지 않지만 raw memory JSON 파일은 수정한다. 처음 보강된 destructive pattern은 `--no-sync`가 있으면 `add_memory.py`를 감지하지 않도록 되어 있어 파일 변경 명령이 approval gate를 우회할 수 있었다.

## Why

`--no-sync`를 “비파괴”로 잘못 해석했다. 실제 동작은 sync 생략일 뿐이며 `write_items()`로 로컬 memory 파일을 생성하거나 갱신한다. harness 기준으로는 파일 수정이므로 승인 대상이다.

## What Was Added To Harness

- `plugin/auto-delegate/lib/patterns.ts`에서 `rag/scripts/add_memory.py` 전체를 destructive pattern으로 감지
- `tests/auto-delegate.test.mjs`에 `--no-sync` 포함 command도 `rag-add-memory`로 감지하는 테스트 추가
- `docs/reference/rag.md`에 `add_memory.py`가 raw memory 파일을 수정하고 기본적으로 sync를 호출한다고 명시

## How To Verify

```bash
npm run verify:plugin
```

테스트에서 아래 command가 `rag-add-memory`로 감지되어야 한다.

```bash
python3 rag/scripts/add_memory.py --title x --content y --no-sync
```

실제 `add_memory.py` 명령은 파일을 수정하므로 검증 목적으로 직접 실행하지 않는다.

## Related

- Fix commit: `05dbb30`
- Files: `plugin/auto-delegate/lib/patterns.ts`, `tests/auto-delegate.test.mjs`, `docs/reference/rag.md`, `rag/scripts/add_memory.py`
