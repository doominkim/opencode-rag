---
name: rag-ops
description: Safe RAG search, snapshot, ingest, sync, and bootstrap operations.
---

# RAG Ops

Use this skill for RAG scripts, source manifests, jobs, search, snapshots, ingest, sync, and bootstrap work.

## Safety Rules
- Treat `sync`, `ingest`, `bootstrap`, and `load_docs` as destructive or potentially destructive.
- Get explicit user approval before destructive commands.
- Before approval, state namespace, source key or manifest, input file, and deletion/overwrite scope.
- Prefer read-only search, config inspection, dry-run, and `python3 -m py_compile` first.
- Never print `.env`, tokens, private keys, or secrets.

## Read-Only Defaults
- Search existing data before syncing new data.
- Inspect `rag/sources/*.json` and `rag/jobs/*.json` before running jobs.
- Compile changed Python files with `python3 -m py_compile`.

## Output
- Read-only checks performed
- Destructive commands requiring approval
- Impact scope
- Deletion possibility
- Recommended next step
