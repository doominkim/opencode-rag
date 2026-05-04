# opencode-godmode

OpenCode 전역 설정 저장소. subagent, slash command, skill, plugin, 그리고 PostgreSQL 기반 RAG 도구를 함께 관리한다.

`AGENTS.md`가 OpenCode 세션의 동작 규칙을 정의하고, 이 README는 저장소 구조와 진입점을 정리한다.

---

## Layout

```
.config/opencode/
├── AGENTS.md              # OpenCode 세션 우선 지침 (delegation, safety, RAG)
├── opencode.json          # provider/model/plugin 등록
├── personal.json          # 개인용 MCP (github remote, figma 로컬 브릿지)
├── company.json           # 회사용 설정
├── agent/*.md             # subagent 정의
├── command/*.md           # slash command (/save-plan, /resume-plan 등)
├── skills/                # 모델 preset + 도메인 skill
│   ├── _presets/          #   quick / research / deep-think / cheap-bulk
│   └── domain/            #   rag-ops / git-master / review-work / frontend-ui-ux
├── docs/                  # configuration / orchestration / RAG reference
├── incidents/             # harness 실패 기록과 정책 근거
├── scripts/verify.mjs     # repo-wide non-destructive verification
├── tests/*.test.mjs       # auto-delegate safety tests
├── plugin/
│   └── auto-delegate/     # prompt 패턴 감지 → subagent reminder
├── .plans/                # plan 본문(.md) commit / 상태(.state.json) gitignore
├── .theseus/              # theseus/metis 세션의 자동 영속화 state — gitignore
└── rag/                   # PostgreSQL + pgvector 기반 RAG
    ├── scripts/*.py       # ingest / sync / search CLI
    ├── sources/*.json     # ingest 범위
    ├── jobs/*.json        # 반복 실행 manifest
    ├── sql/001_init.sql   # 스키마
    └── *-policy.json      # source authority / namespace 기본값
```

---

## Verification

```bash
npm run verify
npm run verify:plugin
npm run verify:rag
```

`npm run verify`는 markdown fence, JSON 문법, RAG Python compile, auto-delegate 핵심 테스트를 확인한다. CI도 같은 명령을 실행한다.

---

## Docs

| 문서 | 내용 |
|---|---|
| `docs/reference/configuration.md` | 설정 파일, plugin safety, skill discovery, commit 대상 |
| `docs/guide/orchestration.md` | `/work`, plan, verify 진입점 선택 기준 |
| `docs/reference/rag.md` | RAG read-only 명령, destructive 승인 절차, 삭제 범위 |

---

## Incidents (`incidents/`)

`incidents/`는 harness 변경의 근거를 남기는 기록소다. 실제 실패가 있었고, 그 실패를 막기 위해 `AGENTS.md`, hook, test, command, agent 정책 중 하나를 바꾼 경우에만 작성한다.

예:
- `grep` regex 실패 → `rg` 우선 검색 규칙 추가
- `auto-delegate` module resolution 실패 → local plugin dependency와 verify smoke check 추가
- `permission.ask` input shape 오판 → permission gate 후보 필드와 테스트 보강

일반 버그, typo, 단순 refactor는 incident로 기록하지 않는다.

---

## Subagents (`agent/`)

> **이 저장소의 디폴트 바이어스는 DELEGATE다.** 직접 작업은 super simple할 때만, 그 외엔 specialist 위임이 디폴트.

prompt 키워드 또는 명시 호출로 위임된다. `plugin/auto-delegate`가 user message에 위임 권고 텍스트와 Task 호출 템플릿을 주입하지만, **실제 위임은 primary agent가 Task tool을 호출해야 일어난다.** plugin이 직접 agent를 바꾸지는 못한다 (OpenCode plugin SDK 제약).

| agent | 용도 | preset |
|---|---|---|
| `theseus` | **orchestrator** — 의도 게이트 → 위임 → 검증 끝까지 끌고 감 | deep-think |
| `architect` | 설계, 책임 배치, 레이어링 | deep-think |
| `prometheus` | plan 작성 (`.plans/<slug>.md`) + interview mode | deep-think |
| `metis` | plan 단계별 실행 (마일스톤 단위) | deep-think |
| `api` | API 설계/구현 | deep-think |
| `backend` | service, cron, batch, worker, domain logic 구현 | deep-think |
| `db-designer` | schema, index, migration | deep-think |
| `frontend` | UI/UX 구현 | deep-think |
| `security` | 인증/인가/보안 검토 | research |
| `reviewer` | 변경사항 검토 | research |
| `verifier` | 빌드/테스트/검증 | quick |
| `oracle` | 코드베이스 질문, 근거 추적 | research |
| `explore` | 코드/문서 탐색 | research |
| `librarian` | 파일 위치, 명명 패턴 | quick |
| `multimodal-looker` | 스크린샷/Figma 검토 | research |
| `commit-message` | 커밋 메시지 작성 | quick |

전체 매트릭스는 `AGENTS.md` → Delegation Matrix 참조.

### theseus orchestrator

큰/모호한/cross-domain 작업은 `/work`로 진입해 theseus가 처리한다:
1. **의도 게이트** — 표면 표현을 실제 의도로 매핑 (`[intent] <분류> — 근거`)
2. **위임 contract 6필드** — TASK / EXPECTED OUTCOME / REQUIRED TOOLS / MUST DO / MUST NOT DO / CONTEXT
3. **병렬 위임** — 독립 영역은 한 메시지에 다중 Task
4. **검증 게이트** — 영역별 비파괴 검증 (tsc/nest build/pytest/jest/py_compile)
5. **실패 처리** — subagent 호출 실패 시 재시도 루프 없이 원인 확인 후 직접 처리하거나 사용자에게 보고
6. **persistence** — 멈추지 않음. 단, destructive·결제·다중 해석 시엔 사용자 승인에서 멈춤

---

## Slash Commands (`command/`)

| command | agent | 설명 |
|---|---|---|
| `/work <task>` | theseus | orchestrator 진입 — 의도 게이트 → 위임 → 검증 |
| `/save-plan <slug>` | prometheus | 현재 작업을 마일스톤 plan으로 분해해 `.plans/<slug>.md`에 저장 |
| `/resume-plan <slug>` | metis | plan + state를 로드해 다음 마일스톤만 실행 |
| `/review-work` | reviewer | 변경사항 리뷰 (회귀, 운영 edge case) |
| `/verify` | verifier | 비파괴 검증 (build/test/lint) |
| `/research` | explore | 코드/문서 탐색 |
| `/rag-safe-work` | build (OpenCode 기본 primary) | RAG 검색/적재/sync/bootstrap을 안전 절차로 |
| `/handoff` | build (OpenCode 기본 primary) | 다른 agent 또는 차후 세션을 위한 작업 요약 |

> `build`는 OpenCode가 다른 agent 지정이 없을 때 fallback으로 쓰는 기본 primary mode다 (`@opencode-ai/sdk` 타입 정의 기준). subagent가 아니라 일반 세션이 그대로 처리한다는 뜻.

---

## Skills (`skills/`)

2계층 구조 (`skills/_presets/*.md`, `skills/domain/<name>/SKILL.md`). 자세한 내용은 `skills/README.md`.

> **현재 상태**: OpenCode native skill 디스커버리가 1-depth `<name>/SKILL.md` 형태만 인식할 가능성이 있다. 이 저장소의 `_presets/*.md`(SKILL.md 명명 규약 미준수)와 `domain/<name>/SKILL.md`(중첩)는 **문서·라우팅 메타데이터로만** 동작한다고 가정한다. native skill 등록이 필요하면 평탄화하거나 명명 규약을 맞춰야 한다.
>
> preset의 실제 model param 적용은 `plugin/auto-delegate`의 `chat.params` hook이 담당한다 (`lib/presets.ts` 참고). skill 파일은 사람용 참조 문서.

### `_presets/` — 모델·온도 프리셋 (참조 문서)
호출 비용/속도/깊이 트레이드오프를 추상 라벨로 표현.
- `quick` — 저비용, 빠른 응답
- `research` — 탐색·요약 중심
- `deep-think` — 큰 추론·설계
- `cheap-bulk` — 반복적·기계적 작업

### `domain/` — 도메인 지식과 안전 규칙
- `rag-ops` — RAG 검색·적재·sync 안전 규칙
- `git-master` — git 히스토리, diff, commit 메시지
- `review-work` — 리뷰 우선순위와 finding 형식
- `frontend-ui-ux` — UI/UX 구현 가이드

합성 패턴(개념): `delegate(category=<preset>, skills=[<domain>...])`.

---

## Plugin (`plugin/auto-delegate/`)

OpenCode hook으로 동작하는 위임·정책 보조 플러그인. 현재 11개 hook 사용.

| hook | 파일 | 역할 |
|---|---|---|
| `chat.message` | `hooks/user-prompt.ts` + `hooks/state-persist.ts` | user prompt 패턴 매칭 + Task 호출 템플릿 삽입 + theseus/metis 세션 agent 등록 + 새 세션 첫 prompt에 latest state resume 주입 |
| `chat.params` | `hooks/chat-params.ts` | active agent의 preset → `temperature` 실제 override (token 상한은 provider 호환성 문제로 제거, `incidents/2026-05-04-*.md` 참고) |
| `experimental.chat.system.transform` | `hooks/system-inject.ts` | system prompt에 위임 정책 텍스트 주입 |
| `experimental.session.compacting` | `hooks/session-compact.ts` | 세션 압축 시 보존 체크리스트(orchestrator·plan·위임 정책) 컨텍스트 추가 |
| `experimental.compaction.autocontinue` | `hooks/auto-continue.ts` | theseus/metis 세션은 압축 후 자동 continue 강제 (persistence) |
| `permission.ask` | `hooks/permission-gate.ts` | destructive bash 명령은 강제 `ask` (자동 allow 차단) |
| `command.execute.before` | `hooks/command-pre.ts` | `/work`·`/save-plan`·`/resume-plan`·`/rag-safe-work` 실행 전 preflight 안내 주입 |
| `tool.definition` | `hooks/tool-def.ts` | Task tool description에 "DELEGATE 디폴트" 정책 prepend |
| `tool.execute.before` | `hooks/tool-pre.ts` | bash destructive 패턴 감지 시 warning 로깅 |
| `tool.execute.after` | `hooks/error-recover.ts` + `hooks/state-persist.ts` | subagent 실패 복구 힌트 + theseus/metis 세션 tool call 누적 |
| `event` | `hooks/event-tap.ts` + `hooks/state-persist.ts` | 이벤트 로깅 + session.idle/compacted 시 `.theseus/<sessionID>.json` 영속화 |

### 동작 범위 (가능 vs 불가능)

OpenCode plugin SDK 한계상 다음을 구분한다:
- **가능**: user message·system prompt 텍스트 주입, sampling params (`temperature`/`topP`/`topK`) override, **permission 게이트로 명령 ask 강제**, slash command preflight 안내, tool description 변경, 압축 컨텍스트 보존, 압축 후 자동 continue 제어, 도구 호출 전·후 로깅. (`maxOutputTokens`도 SDK 차원에선 가능하지만 OpenAI Chat Completions가 거부하여 auto-delegate에서는 적용하지 않음.)
- **불가능**: agent 자체 교체, 모델 ID 변경, 도구 호출 결과 가로채기.

위임 자체는 여전히 권고지만, **destructive 명령은 permission.ask 강제로 실제 게이트가 작동한다** (Codex가 지적한 "warning만" 한계 해소).

### Confidence 등급

`lib/router.ts`가 prompt를 파싱해 등급을 매긴다:
- `explicit` — prompt에 `@<agent>` 또는 `/<agent>`가 등장하고 알려진 agent
- `high` — 서로 다른 trigger가 2개 이상 매칭
- `medium` — 단일 trigger 매칭
- `none` — 매칭 없음 (reminder 미삽입)

`high` / `explicit`은 "직접 처리 전 Task 우선 검토"라는 강한 어조, `medium`은 "단순하면 직접 처리도 가능"이라는 약한 어조.

### Preset 적용

`lib/presets.ts`의 `AGENT_PRESET` 매핑이 active agent마다 sampling params를 override 한다. 모델 ID는 사용자가 직접 선택한다 (chat.params로는 변경 불가).

### Persistence (theseus / metis)

`hooks/auto-continue.ts`는 active agent가 `theseus`나 `metis`일 때 `experimental.compaction.autocontinue`의 `enabled`를 강제로 true로 둔다. 그 외 세션은 OpenCode 기본값을 따른다.

### Session State 자동 영속화 (.theseus/)

theseus / metis 세션은 다음을 자동으로 `.theseus/<sessionID>.json`에 기록 (gitignore):

- `agent`, `started`, `lastActivity`, `intent`(캡처되면), `lastUserText`(600자), `toolCalls`(최근 50개, args는 200자 preview)

트리거:
- `session.idle` 또는 `session.compacted` 이벤트 발생 시 자동 dump
- 매 chat.message / tool.execute.after에서 메모리 캐시에 누적

`.theseus/latest.json`은 가장 최근 활동 sessionID에 대한 포인터. 새 세션의 첫 user message에서 user-prompt hook이 자동으로 latest state를 reminder로 주입한다 (현재 agent가 theseus/metis거나 latest와 같은 agent일 때).

→ `/handoff` 같은 수동 인계 명령 없이도 session 간 컨텍스트가 자동 영속화된다. oh-my-openagent의 `.sisyphus/` 패턴과 같은 방향.

### 압축 보존 (session-compact)

`hooks/session-compact.ts`는 압축 prompt의 `context` 배열에 다음을 push:
- 현재 active orchestrator + 의도 게이트 결과
- 진행 중 plan slug + 마일스톤 위치
- 위임 흐름과 검증 상태
- destructive 승인 대기 항목
- 사용자가 명시한 제약, 실패 검증과 재시도 횟수
- 디폴트 바이어스 = DELEGATE

### Smoke Test

플러그인이 실제로 로드됐는지 확인:
```bash
# 최근 200줄
tail -n 200 logs/auto-delegate.jsonl

# init 확인
grep -m1 '"scope":"plugin.init"' logs/auto-delegate.jsonl

# router 매칭 (DB 키워드 prompt 후)
grep '"scope":"router.match"' logs/auto-delegate.jsonl | tail -5

# preset 적용 (subagent 진입 후)
grep '"scope":"chat-params.preset-applied"' logs/auto-delegate.jsonl | tail -5

# destructive 게이트 (위험 bash 시도 후)
grep '"scope":"permission-gate.force-ask"' logs/auto-delegate.jsonl | tail -5
grep '"scope":"tool-pre.destructive-detected"' logs/auto-delegate.jsonl | tail -5

# 압축 보존 (세션 압축 후)
grep '"scope":"session-compact.preserve-checklist"' logs/auto-delegate.jsonl | tail -5

# autocontinue (theseus/metis 압축 후)
grep '"scope":"auto-continue.persist"' logs/auto-delegate.jsonl | tail -5

# command preflight (/work 등 실행 후)
grep '"scope":"command-pre.preflight-injected"' logs/auto-delegate.jsonl | tail -5

# Task tool description 패치 (도구 정의 노출 시점에 1회)
grep '"scope":"tool-def.patched"' logs/auto-delegate.jsonl | tail -5

# state 자동 영속화 (theseus/metis 세션 idle 시)
grep '"scope":"state-persist.dumped"' logs/auto-delegate.jsonl | tail -5

# resume 주입 (새 세션 첫 prompt 시)
grep '"scope":"user-prompt.resume-injected"' logs/auto-delegate.jsonl | tail -5

# 영속화된 state 직접 보기
ls -la .theseus/
cat .theseus/latest.json
```

`logs/auto-delegate.jsonl`은 gitignore 대상.

trigger 패턴은 `lib/agents.ts`, agent→preset 매핑은 `lib/presets.ts`, destructive 패턴은 `lib/patterns.ts`에 정의. `opencode.json`의 `plugin` 배열에 `auto-delegate`로 등록.

---

## Plan Resume Convention (`.plans/`)

큰 작업은 plan 파일과 state 파일로 세션 간 재개한다.

1. `prometheus` → `/save-plan <slug>` → `.plans/<slug>.md` 생성
2. `metis` → `/resume-plan <slug>` → `.plans/<slug>.state.json` 읽고 다음 마일스톤 한 개만 실행
3. plan 본문은 commit 대상, `.state.json`은 gitignore
4. 검증 실패 시 다음 마일스톤 진행 금지
5. destructive 단계는 plan 본문에 사용자 승인 게이트 명시

---

## RAG (`rag/`)

PostgreSQL + pgvector 기반 전역 지식 검색. 기본 namespace: `workspace`, `global-domain-knowledge`, `rag-base`.

### Setup
1. `rag/.env.example`을 참고해 `rag/.env` 생성
2. 로컬에 `psql`, `createdb`, PostgreSQL `pgvector` extension 준비
3. DB 초기화: `bash rag/scripts/bootstrap.sh`

필수 환경변수: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`. OpenAI embedding을 쓰려면 `OPENAI_API_KEY` 추가, 없으면 `local-hash-1536` fallback.

### 검색
```bash
# 기본 검색 (workspace + global-domain-knowledge + rag-base)
python3 rag/scripts/search.py --query "배포 규칙" --limit 5

# namespace 한정
python3 rag/scripts/search.py --namespace workspace --query "workflow" --limit 5

# source 필터
python3 rag/scripts/search.py --namespace global-domain-knowledge --source memory_bank --query "enum" --limit 5

# agent overlay
python3 rag/scripts/search.py --query "api 패턴" --agent api
```

검색은 `rag_chunks` 기준이며 vector score, text score, source authority, namespace bias를 반영한다.

### 적재 / 동기화
```bash
# Workspace 전체 repo/worktree 적재
python3 rag/scripts/sync_workspace_repo_docs.py --namespace workspace

# 특정 manifest 적재
python3 rag/scripts/load_docs.py --namespace workspace --manifest <name>

# Notion snapshot staging
python3 rag/scripts/fetch_notion_snapshot.py --source notion_company_tree --input <json>

# Notion sync
python3 rag/scripts/sync_notion.py --source notion_company_tree --input <file> --namespace global-domain-knowledge

# memory 전체 동기화
python3 rag/scripts/sync_memories.py --source memory_bank --input <file> --namespace global-domain-knowledge

# memory 1건 추가
python3 rag/scripts/add_memory.py --title "..." --content "..." --memory-type preference \
  --scenario-key coding-preferences --tags tag1 tag2 --stability stable --confidence 0.9

# job manifest 실행
python3 rag/scripts/run_job.py --job rag/jobs/notion_inventory_daily.json
```

### Jobs (`rag/jobs/`)
| job | 설명 |
|---|---|
| `workspace_repo_docs_sync.json` | `~/Workspace` 아래 git repo/worktree 문서 → `workspace` |
| `memory_bank_manual.json` | `rag/data/raw/memory/global_preferences.json` → `global-domain-knowledge` |
| `notion_inventory_daily.json` | staged Notion snapshot → `global-domain-knowledge` |
| `drug_master_full_sync.json` | disabled. `drug_master_sync` 파이프라인 미구현 |

### Sync 주의
- ingest/sync 스크립트는 upsert 뒤 이번 입력에 없는 행을 **삭제**한다. 부분 샘플로 실행하면 같은 `namespace + source_key` 범위의 기존 문서가 지워진다.
- `load_docs.py`: `source_path = repo_docs/<source_key>/...`
- `sync_workspace_repo_docs.py`: repo별 source key = `workspace-<name>-<gitdir-hash>`
- `sync_memories.py`: 삭제 범위 = raw 파일 stem 기반 `collection_key`
- `sync_notion.py`: 빈 snapshot 기본 거부. 의도적 전체 삭제 시 `--allow-empty`
- `fetch_notion_snapshot.py`: API 호출 안 함. 준비된 JSON을 `rag/data/raw/notion/<source>/`에 복사

---

## MCP 설정 메모

`personal.json`:
- **github**: GitHub Copilot remote MCP (`api.githubcopilot.com/mcp/`). `GITHUB_MCP_PAT_PERSONAL` 환경변수 필요.
- **figma**: 로컬 Figma desktop의 MCP 브릿지 (`http://127.0.0.1:3845/mcp`). 원격 `mcp.figma.com/mcp`가 아니라 데스크톱 앱이 노출하는 로컬 endpoint를 쓴다 — 인증을 데스크톱에 위임하고 회사 망 정책과 무관하게 동작시키는 구성.

`company.json`은 회사 환경 분리용 별도 설정 파일.

---

## Source Authority

검색 결과 우선순위:
1. `AGENTS.md`
2. `notion`
3. `drug_master`
4. `memory_bank`

ingestion 기준은 `rag/sources/*.json`. 충돌 시 명시적 규칙 > 최신 데이터.

---

## Verification

테스트 설정 없음. 수정한 스크립트는 직접 실행하거나 문법 확인.

```bash
# 전체 스크립트 문법 확인
python3 -m py_compile rag/scripts/*.py

# 문서 수정: fenced code block 닫힘 확인
```

---

## Safety Rules (요약)

자세한 규칙은 `AGENTS.md` 참조.

- **승인 없이 금지**: commit, push, deploy, destructive sync/ingest/bootstrap/migration
- **출력 금지**: `.env`, secret, token, private key
- **부분 샘플 금지**: ingest/sync에 부분 샘플 입력 사용 금지
- **검증은 비파괴 명령만**: dry-run / read-only 우선
- **plan destructive 단계**: 사용자 승인 게이트 명시 필수
