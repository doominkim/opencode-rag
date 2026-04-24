#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from rag_common import load_env, run_psql, sql_literal, upsert_document_chunks


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Rebuild chunk embeddings for indexed documents")
    parser.add_argument("--namespace", required=True, help="namespace key to reindex")
    parser.add_argument("--source", help="optional source_key filter")
    parser.add_argument("--limit", type=int, help="optional document limit for partial reindex")
    return parser.parse_args()


def load_documents(namespace: str, source: str | None, limit: int | None) -> list[dict]:
    source_filter = f"AND d.source_key = {sql_literal(source)}" if source else ""
    limit_clause = f"LIMIT {limit}" if limit else ""
    query = f"""
    SELECT COALESCE(json_agg(row_to_json(rows)), '[]'::json)::text
    FROM (
      SELECT
        d.id,
        n.namespace_key,
        d.source_key,
        d.source_document_id,
        d.title,
        d.content,
        d.metadata
      FROM rag_documents d
      INNER JOIN namespaces n ON n.id = d.namespace_id
      WHERE n.namespace_key = {sql_literal(namespace)}
        {source_filter}
      ORDER BY d.source_key ASC, d.source_path ASC
      {limit_clause}
    ) rows;
    """
    payload = run_psql(query, capture_output=True) or "[]"
    documents = json.loads(payload)
    for document in documents:
        document["metadata"] = document.get("metadata") or {}
    return documents


def main() -> None:
    args = parse_args()
    root = Path(__file__).resolve().parent.parent
    load_env(root / ".env")

    documents = load_documents(args.namespace, args.source, args.limit)
    total_chunks = 0
    for document in documents:
        total_chunks += upsert_document_chunks(document["id"], document)

    print(json.dumps({
        "namespace": args.namespace,
        "source": args.source,
        "documents_reindexed": len(documents),
        "chunks_upserted": total_chunks,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
