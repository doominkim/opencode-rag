# OpenCode Config + Global RAG

이 저장소는 OpenCode 설정과 전역 PostgreSQL RAG 도구를 함께 관리합니다. 루트 `package.json`은 OpenCode 플러그인 의존성만 가지며, 실제 RAG 진입점은 `rag/scripts/*.py`와 `rag/scripts/bootstrap.sh`입니다.

## Layout
- `AGENTS.md`: 이 저장소에서 OpenCode 세션이 따라야 할 우선 지침
- `opencode.json`, `company.json`, `personal.json`: OpenCode 로컬 설정
- `agent/*.md`: subagent 정의
- `rag/scripts/*.py`: RAG 적재, 검색, job 실행 CLI
- `rag/sql/001_init.sql`: PostgreSQL/pgvector 스키마
- `rag/sources/*.json`: ingest 범위와 source key 설정
- `rag/jobs/*.json`: 반복 실행할 job manifest
- `rag/source-policy.json`, `rag/namespace-policy.json`: 검색 authority와 namespace 기본값

## Setup
1. `rag/.env.example`을 참고해 `rag/.env`를 만든다.
2. 로컬에 `psql`, `createdb`, PostgreSQL `pgvector` extension을 준비한다.
3. DB를 초기화한다: `bash rag/scripts/bootstrap.sh`

필수 DB 환경변수는 `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`입니다. OpenAI embedding을 쓰려면 `OPENAI_API_KEY`를 추가하고, 없으면 `local-hash-1536` fallback embedding으로 동작합니다.

## Common Commands
- 기본 검색: `python3 rag/scripts/search.py --namespace workspace --query "workflow" --limit 5`
- 기본 namespace 전체 검색: `python3 rag/scripts/search.py --query "배포 규칙" --limit 5`
- source 필터 검색: `python3 rag/scripts/search.py --namespace global-domain-knowledge --source memory_bank --query "enum" --limit 5`
- Workspace 전체 repo/worktree 적재: `python3 rag/scripts/sync_workspace_repo_docs.py --namespace workspace`
- 특정 manifest 적재: `python3 rag/scripts/load_docs.py --namespace workspace --manifest vanpahrm-stock`
- Notion snapshot staging: `python3 rag/scripts/fetch_notion_snapshot.py --source notion_company_tree --input <json>`
- Notion 동기화: `python3 rag/scripts/sync_notion.py --source notion_company_tree --input ~/.config/opencode/rag/data/raw/notion/notion_company_tree/latest.json --namespace global-domain-knowledge`
- memory 전체 동기화: `python3 rag/scripts/sync_memories.py --source memory_bank --input ~/.config/opencode/rag/data/raw/memory/global_preferences.json --namespace global-domain-knowledge`
- memory 1건 추가: `python3 rag/scripts/add_memory.py --title "..." --content "..." --memory-type preference --scenario-key coding-preferences --tags tag1 tag2 --stability stable --confidence 0.9`
- job manifest 실행: `python3 rag/scripts/run_job.py --job rag/jobs/notion_inventory_daily.json`

## Jobs
- `rag/jobs/workspace_repo_docs_sync.json`: `/Users/dominic/Workspace` 아래 git repo/worktree 문서를 `workspace` namespace로 동기화
- `rag/jobs/memory_bank_manual.json`: `rag/data/raw/memory/global_preferences.json`을 `global-domain-knowledge` namespace로 동기화
- `rag/jobs/notion_inventory_daily.json`: staged Notion snapshot을 `global-domain-knowledge` namespace로 동기화
- `rag/jobs/drug_master_full_sync.json`: disabled 상태이며 `drug_master_sync` 파이프라인 구현 전에는 실행 대상이 아님

## Search Model
- 기본 검색 namespace는 `workspace`, `global-domain-knowledge`, `rag-base`입니다.
- `--namespace`를 주면 해당 namespace만 검색합니다.
- `--agent <key>`를 주면 기본 namespace 뒤에 agent namespace를 overlay합니다.
- 검색은 `rag_chunks` 기준이며 vector score, text score, source authority, namespace bias를 함께 반영합니다.

## Sync Notes
- ingest/sync 스크립트는 upsert 뒤 이번 입력에 없는 행을 삭제합니다. 부분 샘플로 실행하면 같은 `namespace + source_key` 범위의 기존 문서가 지워질 수 있습니다.
- `rag/scripts/load_docs.py`는 `source_path`를 `repo_docs/<source_key>/...`로 저장합니다.
- `rag/scripts/sync_workspace_repo_docs.py`는 repo별 source key를 `workspace-<name>-<gitdir-hash>`로 만듭니다.
- `rag/scripts/sync_memories.py`의 삭제 범위는 raw 파일 stem 기반 `collection_key`입니다.
- `rag/scripts/fetch_notion_snapshot.py`는 Notion API를 호출하지 않고 준비된 JSON을 `rag/data/raw/notion/<source>/`에 복사합니다.
- Notion 입력은 page 배열 또는 `{ "pages": [...] }`이며 각 page에 `page_id` 또는 `id`가 필요합니다. 빈 snapshot은 기본 거부하고 의도적 전체 삭제일 때만 `--allow-empty`를 씁니다.

## Verification
- 테스트 설정은 없습니다. 수정한 스크립트는 직접 실행하거나 문법 확인을 합니다.
- 전체 스크립트 문법 확인: `python3 -m py_compile rag/scripts/*.py`
