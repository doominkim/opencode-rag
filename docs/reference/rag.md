# RAG Reference

## 기본 연결

RAG 스크립트는 `rag/.env`를 읽어 PostgreSQL에 연결한다. 비밀값은 출력하지 않는다.

주요 namespace:
- `workspace`
- `global-domain-knowledge`
- `rag-base`

## Read-only 명령

```bash
python3 -m py_compile rag/scripts/*.py
python3 rag/scripts/search.py --namespace workspace --query "<query>" --limit 5
python3 rag/scripts/search.py --namespace global-domain-knowledge --source memory_bank --query "<query>" --limit 5
```

## 승인 필요한 명령

다음은 destructive 또는 potentially destructive로 취급한다.

```bash
bash rag/scripts/bootstrap.sh
python3 rag/scripts/sync_workspace_repo_docs.py --namespace workspace
python3 rag/scripts/load_docs.py --namespace workspace --manifest <name>
python3 rag/scripts/sync_notion.py --source notion_company_tree --input <file> --namespace global-domain-knowledge
python3 rag/scripts/sync_memories.py --source memory_bank --input <file> --namespace global-domain-knowledge
python3 rag/scripts/add_memory.py --title "<title>" --content "<content>"
```

승인 전 반드시 명시할 것:
- 실행할 명령
- namespace
- source key 또는 manifest
- 입력 파일
- 삭제/덮어쓰기 가능 범위
- 가능한 read-only 대안

## 삭제 범위 메모

| 스크립트 | 주의점 |
|---|---|
| `sync_workspace_repo_docs.py` | workspace repo 스캔 결과 기준으로 누락 데이터 정리 가능 |
| `load_docs.py` | `repo_docs/<source_key>/...` source_path를 upsert |
| `sync_notion.py` | 빈 snapshot은 기본 거부, sync 시 source 기준 정리 가능 |
| `sync_memories.py` | `collection_key` 범위 정리 가능 |
| `add_memory.py` | 기본적으로 raw memory 파일을 수정하고 `sync_memories.py`를 호출 |
