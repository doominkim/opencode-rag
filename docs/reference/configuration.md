# Configuration Reference

이 저장소는 `opencode-godmode`용 전역 OpenCode 설정을 관리한다.

## 주요 파일

| 경로 | 역할 |
|---|---|
| `opencode.json` | provider, MCP, plugin 등록 |
| `agent/*.md` | subagent 정의와 권한 |
| `command/*.md` | slash command 정의 |
| `skills/` | domain skill과 preset 문서 |
| `plugin/auto-delegate/` | routing reminder, destructive gate, session persistence hook |
| `rag/` | PostgreSQL + pgvector 기반 RAG 스크립트와 설정 |
| `incidents/` | harness 실패 기록과 정책 근거 |

## 검증 명령

```bash
npm run verify
npm run verify:plugin
npm run verify:rag
```

`npm run verify`는 markdown fence, JSON 문법, RAG Python compile, auto-delegate 핵심 테스트를 확인한다.

## Plugin Safety

`plugin/auto-delegate/hooks/permission-gate.ts`는 destructive bash 명령을 강제로 `ask`로 바꾼다.

감지 패턴은 `plugin/auto-delegate/lib/patterns.ts`에 있다. 패턴 변경 시 `tests/auto-delegate.test.mjs`를 함께 갱신한다.

## Skill Discovery

현재 skill은 `skills/domain/<name>/SKILL.md` 구조다. OpenCode native discovery가 1-depth만 안정적으로 지원되는 환경이면 `skills/<name>/SKILL.md`로 평탄화하거나 alias를 둔다.

## Commit 대상

commit 대상:
- `agent/`, `command/`, `skills/`, `plugin/`, `rag/scripts`, `rag/sql`, `rag/sources`, `rag/jobs`, `docs/`, `incidents/`, `.github/`, `package.json`, `package-lock.json`

commit 제외:
- `rag/.env`, `logs/`, `rag/logs/`, `.theseus/`, `.plans/*.state.json`, `node_modules/`
