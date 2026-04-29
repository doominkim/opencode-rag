# RAG Area Rules

- `.env`, token, private key, DB password를 출력하지 않는다.
- `sync`, `ingest`, `bootstrap`, `load_docs`, 기본 `add_memory.py`는 승인 전 실행하지 않는다.
- destructive 명령 전 namespace, source key, input, 삭제/덮어쓰기 범위를 설명한다.
- Python 변경 후 `python3 -m py_compile rag/scripts/*.py`를 실행한다.
- read-only search와 설정 확인을 먼저 수행한다.
