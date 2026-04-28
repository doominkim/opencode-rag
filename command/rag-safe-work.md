---
description: Safely handle RAG search, inspection, ingest, sync, and bootstrap workflows.
agent: build
---

# RAG Safe Workflow

Use this command for RAG search, source inspection, snapshots, load, ingest, sync, or bootstrap-related work.

## Safety Rules
- `sync`, `ingest`, `bootstrap`, and `load_docs` are destructive or potentially destructive.
- Before any destructive command, explain impact scope and deletion possibility, then get explicit user approval.
- Prefer read-only search, config inspection, dry-run, or syntax validation first.
- Never run partial sample ingest/sync unless the user explicitly approves the exact scope.

## Required Preflight For Destructive Commands
1. Command to run.
2. Namespace.
3. Source key or manifest.
4. Files or snapshot input involved.
5. Possible deletion/overwrite scope.
6. Safer read-only alternative, if available.
7. Explicit user approval.

## Read-Only First Options
```bash
python3 -m py_compile /Users/dominic/.config/opencode/rag/scripts/<file>.py
python3 /Users/dominic/.config/opencode/rag/scripts/search.py --namespace workspace --query "<query>" --limit 5
python3 /Users/dominic/.config/opencode/rag/scripts/search.py --namespace global-domain-knowledge --source memory_bank --query "<query>" --limit 5
```

## Destructive Commands Requiring Approval
```bash
bash /Users/dominic/.config/opencode/rag/scripts/bootstrap.sh
python3 /Users/dominic/.config/opencode/rag/scripts/sync_workspace_repo_docs.py --namespace workspace
python3 /Users/dominic/.config/opencode/rag/scripts/load_docs.py --namespace workspace --manifest <name>
python3 /Users/dominic/.config/opencode/rag/scripts/sync_notion.py --source notion_company_tree --input <file> --namespace global-domain-knowledge
python3 /Users/dominic/.config/opencode/rag/scripts/sync_memories.py --source memory_bank --input <file> --namespace global-domain-knowledge
```

## Final Output
- 수행한 read-only 확인
- 승인 대기 중인 destructive 명령, 있는 경우
- 영향 범위와 삭제 가능성
- 다음 권장 단계
