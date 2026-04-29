# AGENTS.md

---

## Communication
- 항상 한국어로 답변한다. 사용자가 명시적으로 다른 언어를 요청한 경우에만 변경한다.
- 코드, 로그, 에러, 명령어, API 스키마, 고유명사는 원문을 유지하고 설명만 한국어로 한다.
- 커밋 메시지는 사용자가 명시적으로 다른 언어를 요청하지 않는 한 항상 한글로 작성한다.
- subagent 또는 RAG 사용 시 응답 끝에 아래 포맷으로 요약을 추가한다:
  - `[subagent: <name>]`
  - `[rag: <namespace>, query="<query>"]`
  - 여러 개일 경우 콤마로 나열
- 사용하지 않은 경우 생략한다.

---

## Search Conventions
- 로컬 파일/텍스트 검색은 기본적으로 `rg`를 우선한다.
- `grep`을 직접 사용할 때 alternation(`|`), group, escaped parenthesis가 들어간 패턴이면 반드시 `grep -E` 또는 `rg`를 사용한다.
- 기본 `grep`(BRE)에서 literal `(`는 `(`로 쓰고, `\(`는 그룹 시작으로 해석되어 `parentheses not balanced`를 만들 수 있다.
- 검색 명령이 regex 오류로 실패하면 결과 없음으로 판단하지 말고, `rg` 또는 올바른 `grep -E` 패턴으로 재실행한 뒤 판단한다.

---

## Incident Ratchet
- 실제 harness 실패를 막기 위해 `AGENTS.md`, hook, test, command, agent 정책을 바꾸면 `incidents/YYYY-MM-DD-<slug>.md`를 작성한다.
- incident는 과거 사실과 정책 근거를 남기는 용도다. 일반 버그, typo, 단순 refactor는 기록하지 않는다.
- incident 형식은 `incidents/README.md`를 따른다.

---

## Subagent Delegation Policy

> **이 저장소의 디폴트 바이어스는 DELEGATE다.** 직접 작업이 아니라 specialist 위임이 산출물 품질의 기본 경로다 (orchestrator-first 패턴).

- 위임이 디폴트다. 직접 작업은 **super simple**할 때만 (단일 줄 fix, 명백한 typo, 한 문장 답변).
- 작업 범위가 모호하거나 도메인이 여러 개면 `/work` (theseus)로 진입한다.
- 작은 작업이라도 위임이 깔끔한 경계를 갖는다면 위임을 우선한다.

- 작업 영향도와 변경 범위에 따라 여러 subagent를 호출할 수 있다.
- monorepo처럼 변경 영역이 분리된 경우, 영역별로 subagent를 나누어 리뷰할 수 있다.
  - 예: api / admin / batch / infra / db
- 단, 각 subagent의 입력 범위와 책임을 명확히 분리한다.
- 서로 의존성이 있는 작업은 순차적으로 처리한다.
- 독립적인 영역 리뷰는 병렬 또는 다중 호출을 허용한다.
- 최종 판단과 통합은 primary agent (또는 theseus)가 담당한다.

- 설계/작업 분해/위험 검토:
  - `architect`
- 기존 변경사항 리뷰:
  - `reviewer`
- 실행 결과 검증/재현/테스트 확인:
  - `verifier`
- 커밋 메시지 작성:
  - `commit-message`
  - Task tool 또는 해당 subagent를 사용할 수 없는 세션에서도 primary agent는 `commit-message`의 출력 규칙, 특히 한글 제목 규칙을 직접 준수한다.
- Backend service / cron / batch / worker / domain logic 구현:
  - `backend`
- DB 스키마, 테이블, 인덱스, 마이그레이션 설계:
  - `db-designer`
- 일반 조사, 단순 보조 작업, 명확히 분류되지 않는 작업:
  - `general-purpose` (fallback agent가 등록된 경우) 또는 직접 처리
  - 단, 구체 specialist가 맞으면 `general-purpose`를 쓰지 말고 specialist를 우선한다.

- subagent 선택이 애매하면 직접 처리한다.
- subagent 호출 실패 시 재시도 루프를 만들지 않고 직접 처리한다.

## Delegation Matrix

`plugin/auto-delegate`가 prompt 패턴을 감지해 user message에 위임 권고와 Task 호출 템플릿을 주입한다. **agent 자체 교체는 plugin이 못 한다** — 실제 위임은 primary agent가 Task tool을 직접 호출해야 일어난다. confidence 등급(`explicit`/`high`/`medium`)에 따라 권고 어조만 다르고, 사용자 override가 항상 우선한다.

| 작업 유형 | 자동 위임 후보 | preset |
|---|---|---|
| 단순 수정, 1파일 변경, 짧은 답변 | (직접 처리) | `quick` |
| 코드/문서 탐색 | `explore`, `librarian` | `research` |
| 코드 베이스 질문, 근거 추적 | `oracle` | `research` |
| 파일 위치, 명명 패턴 | `librarian` | `quick` |
| 시각 자료(스크린샷/Figma) 검토 | `multimodal-looker` | `research` |
| 큰 작업 plan 작성 | `prometheus` | `deep-think` |
| plan 단계별 실행 | `metis` | `deep-think` |
| 설계, 책임 배치, 레이어링 | `architect` | `deep-think` |
| 기존 변경사항 리뷰 | `reviewer` | `research` |
| 빌드/테스트/검증 | `verifier` | `quick` |
| DB schema, migration | `db-designer` | `deep-think` |
| API 설계/구현 | `api` | `deep-think` |
| Backend service, cron, batch, worker 구현 | `backend` | `deep-think` |
| UI/UX 구현 | `frontend` | `deep-think` |
| 보안/인증/인가 검토 | `security` | `research` |
| 커밋 메시지 작성 | `commit-message` | `quick` |
| 명확히 분류되지 않는 조사 | `general-purpose` fallback 또는 직접 처리 | `research` |

## Plan Resume Convention

큰 작업은 plan 파일과 state 파일로 세션 간 재개한다.

- `prometheus` agent가 `.plans/<slug>.md`로 plan을 저장한다 (`/save-plan <slug>`).
- `metis` agent가 plan 본문 + `.plans/<slug>.state.json`을 읽어 한 번에 한 마일스톤만 실행한다 (`/resume-plan <slug>`).
- plan 본문은 commit 대상, `.state.json`은 gitignore.
- 검증 실패 시 다음 마일스톤 진행 금지. 실패 원인 보고가 우선.
- destructive 단계는 plan 본문에 사용자 승인 게이트를 명시한다.

## Delegation Prompt Contract
- subagent 호출 시 가능한 한 아래 구조를 사용한다:
  - `CONTEXT`: 작업 배경, 관련 파일, 사용자가 원하는 결과
  - `TASK`: subagent가 수행할 단일 목표
  - `MUST DO`: 반드시 수행할 구체적 항목
  - `MUST NOT DO`: 금지사항과 범위 밖 작업
  - `VERIFY`: 확인해야 할 명령, 파일, 판단 기준
  - `OUTPUT FORMAT`: primary agent에게 반환할 최종 형식
- subagent 결과는 self-report로 간주한다.
- 최종 판단, 사용자 응답, 파일 변경 여부 결정은 primary agent가 담당한다.
- subagent가 파일을 변경했거나 실행 결과를 보고한 경우, primary agent는 가능한 한 직접 파일/명령 결과로 검증한다.

## Background Task Bookkeeping
- background 또는 장기 subagent 작업을 시작할 때 목적, 담당 subagent, 기대 결과를 명확히 한다.
- subagent 결과에 `task_id`가 있으면 후속 질문이나 보완은 새 작업보다 기존 `task_id` resume을 우선한다.
- 여러 subagent를 병렬 호출한 경우 최종 응답 전에 결과를 통합하고 충돌점을 명시한다.
- 오래 걸리는 조사/검증은 사용자에게 진행 중인 의미 있는 발견이나 blocker만 짧게 알린다.
- 완료 후에는 다음 항목을 점검한다:
  - 요청한 범위가 모두 처리됐는가
  - subagent self-report를 그대로 믿지 않았는가
  - 검증 불가한 항목과 남은 리스크를 사용자에게 밝혔는가

## Category Routing
- `orchestrate`: 의도 분류 → 위임 → 검증 흐름이 필요한 작업. `theseus` (`/work` 진입).
- `plan`: 큰 작업을 마일스톤으로 분해. `prometheus` 작성 → `metis` 실행.
- `quick`: 단순, 저위험, 되돌리기 쉬운 작업. 직접 처리한다.
- `research`: 넓은 코드 탐색, 외부 repo 분석, 문서 비교. `explore` / `oracle` / `librarian`. fallback이 필요하면 `general-purpose`.
- `architecture`: 구조 변경, 경계 판단, 책임 배치. `architect`를 사용한다.
- `api`: REST/GraphQL/RPC 계약·핸들러·미들웨어. `api`를 사용한다.
- `backend`: service, cron, batch, worker, scheduler, queue, domain/business logic 구현. `backend`를 사용한다.
- `frontend`: UI/UX, 컴포넌트, 스타일링, 접근성, 반응형. `frontend`. 시각 자료가 있으면 `multimodal-looker` 선행.
- `db`: schema, index, migration, 쿼리 성능. `db-designer`를 사용한다.
- `security`: 인증/인가, secret/token, CVE, injection류. `security`를 사용한다.
- `review`: 변경사항 검토, 회귀 위험, 운영 edge case. `reviewer`를 사용한다.
- `verification`: 테스트, 빌드, 컴파일, dry-run. `verifier`를 사용한다.
- `commit`: git 변경사항 → 커밋 메시지 생성. `commit-message` (`/commit`).
- `rag`: RAG 검색/적재/sync/스냅샷. 기존 safety rule을 우선하고 destructive 명령은 승인 후 실행한다.

## Question Policy
- 질문은 결과가 달라질 때만 한다.

- 아래 경우는 질문 없이 진행한다:
  - 기존 코드 패턴을 따르면 되는 경우
  - 변경 범위가 작고 되돌리기 쉬운 경우
  - 요구사항이 단일하게 해석되는 경우

- 아래 경우는 반드시 질문한다:
  - 데이터 삭제, 마이그레이션, 배포, 결제 영향이 있는 경우
  - API 계약 또는 DB 스키마 변경이 필요한 경우
  - 요구사항이 2가지 이상으로 해석되고 결과가 달라지는 경우

---

## Implementation Preferences
- 설계 요청은 구현보다 우선한다.
- 아래 조건 중 하나라도 해당하면 구현 전에 질문한다:
  - 요구사항이 모호하거나 다중 해석 가능
  - 데이터 모델 또는 상태 정의가 없음
  - 외부 시스템 의존성이 있음
  - 비즈니스 로직 경계가 불명확함

- CRUD는 필요한 범위만 구현한다.
- 전체 CRUD 요청이 명시된 경우에만 예외적으로 한 번에 생성한다.
- 그 외에는 반드시 검수 가능한 단위로 분할한다.

---

## Forbidden Actions
- 사용자 승인 없이 commit, push, deploy 하지 않는다.
- 사용자 승인 없이 destructive sync, bootstrap, migration을 실행하지 않는다.
- `.env`, secret, token, private key를 출력하지 않는다.
- 대량 파일 생성, 삭제, 이동은 사전 설명 없이 하지 않는다.
- 부분 샘플 파일로 ingest/sync를 실행하지 않는다.
- verifier를 포함한 모든 검증 작업은 비파괴 명령만 실행한다.

> destructive bash 명령은 `plugin/auto-delegate`의 `permission.ask` hook이 강제로 사용자 승인 게이트를 건다 (`hooks/permission-gate.ts`). 패턴은 `lib/patterns.ts` 참고.

---

## Repo Shape
- 실제 작업 대상:
  - `rag/scripts/*.py`
  - `rag/sql`
  - `rag/sources`
  - `rag/jobs`
- 루트 `package.json`은 OpenCode 플러그인 의존성만 포함한다.

- RAG 경로 기준:
  - 루트: `Path(__file__).parent.parent`
  - 설정 파일:
    - `rag/.env`
    - `rag/sources/*.json`
    - `rag/jobs/*.json`

- Python 환경:
  - Python 3.10+ 기준

- 검증 방법:
  - 직접 실행
  - `python3 -m py_compile <files>`

---

## Required Commands
- 아래 명령어는 사용자 요청이 있을 때만 실행한다.

- DB 초기화:
  - `bash rag/scripts/bootstrap.sh`

- 기본 검색:
  - `python3 rag/scripts/search.py --namespace workspace --query "<query>" --limit 5`

- 정책/메모리 검색:
  - `python3 rag/scripts/search.py --namespace global-domain-knowledge --source memory_bank --query "<query>" --limit 5`

- workspace repo 적재:
  - `python3 rag/scripts/sync_workspace_repo_docs.py --namespace workspace`

- 특정 repo 적재:
  - `python3 rag/scripts/load_docs.py --namespace workspace --manifest <name>`

- Notion snapshot:
  - `python3 rag/scripts/fetch_notion_snapshot.py --source notion_company_tree --input <json>`

- Notion sync:
  - `python3 rag/scripts/sync_notion.py --source notion_company_tree --input <file> --namespace global-domain-knowledge`

- memory sync:
  - `python3 rag/scripts/sync_memories.py --source memory_bank --input <file> --namespace global-domain-knowledge`

---

## Execution Safety Rules
- 아래 작업은 destructive로 간주한다:
  - sync / ingest / bootstrap / load_docs

- 실행 전 반드시:
  1. 영향 범위를 요약
  2. 삭제 가능성 명시
  3. 사용자 승인 확보

- 가능하면 dry-run 또는 read-only 검증을 먼저 수행한다.

---

## RAG Use
- 아래 경우에만 search를 사용한다:
  - repo 구조 / 파일 위치
  - 실행 방법 / 스크립트
  - 아키텍처 / 규칙 / 장기 선호

- 단순 구현/일반 지식 질문에는 사용하지 않는다.

- 기본 namespace:
  - `workspace`
  - `global-domain-knowledge`
  - `rag-base`

- embedding:
  - 기본: `text-embedding-3-small`
  - fallback: `local-hash-1536`

---

## Sync Guardrails
- ingest/sync는 누락 데이터 삭제를 포함할 수 있다.

- 실행 전 반드시:
  - namespace + source_key 범위 설명
  - 삭제 가능성 안내

- 주요 제약:
  - `load_docs.py`: source_path = `repo_docs/<source_key>/...`
  - `sync_memories.py`: 삭제 범위 = collection_key
  - `sync_notion.py`: 빈 snapshot 기본 거부 (`--allow-empty` 필요)
  - `sync_workspace_repo_docs.py`: Workspace 전체 스캔

---

## Verification Policy
- 문서 수정:
  - 문법, 구조, 논리 검토
  - fenced code block은 반드시 닫고, 이후 섹션이 코드 블록으로 흡수되지 않았는지 확인

- Python 코드:
  - `python3 -m py_compile`

- DB/RAG 코드:
  - read-only / dry-run 우선

- sync 작업:
  - 실행 전 영향 범위 설명 + 승인 필요

---

## Subagent Boundaries
- `theseus`: orchestrator. 의도 게이트 → 위임 → 검증 → persistence. 직접 코드 수정 금지.
- `architect`: 설계, 분해, 위험 검토
- `prometheus`: plan 작성 + interview mode (plan 전 모호 항목 ≤3 질문)
- `metis`: plan 마일스톤 단위 실행. 한 번에 한 마일스톤
- `api`: REST/GraphQL/RPC API 계약·핸들러·미들웨어·에러 모델 설계·구현
- `backend`: service, cron, batch, worker, scheduler, queue, domain/business logic 구현. API 계약은 `api`, DB schema/migration은 `db-designer`로 분리
- `db-designer`: DB 스키마, 엔티티, 인덱스, 마이그레이션 리스크 검토
- `frontend`: UI/UX, 컴포넌트, 스타일링, 접근성, 반응형 구현
- `security`: 인증/인가, 권한 모델, secret/token, CVE, injection류 검토
- `reviewer`: 변경사항 검토 (회귀, 마이그레이션 리스크, 운영 edge case)
- `verifier`: 실행 및 검증 (build/test/lint, 비파괴만)
- `oracle`: 코드베이스 질문 답변, 근거·이유·출처 추적
- `explore`: 코드/문서 탐색, grep, 위치 검색
- `librarian`: 파일 위치, 명명, 컨벤션
- `multimodal-looker`: 스크린샷/Figma/디자인 캡처 검토
- `commit-message`: 커밋 메시지 작성 (도메인 무관)
- `general-purpose`: 분류가 애매한 일반 보조. 단, 구체 specialist가 맞으면 specialist 우선

- subagent 호출 실패 시:
  - 재시도하지 않고 직접 처리한다.

---

## Source Authority
- 우선순위:
  1. AGENTS.md
  2. notion
  3. drug_master
  4. memory_bank

- ingestion 기준:
  - `rag/sources/*.json`

- 충돌 시:
  - 명시적 규칙 > 최신 데이터

---

## RAG Reliability
- 코드와 RAG 충돌 시 코드 우선
- RAG 간 충돌 시 Source Authority 적용
- 정보 부족 시 추측하지 않음

---

## Final Response Format
- 필요 시 아래 구조로 응답한다:

변경 요약:
- ...

검증 결과:
- ...

남은 리스크:
- ...

작업 위임/RAG 사용 요약:
- [subagent: ...]
- [rag: ...]
