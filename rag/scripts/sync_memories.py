#!/usr/bin/env python3
import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from rag_common import ensure_namespace, load_env, run_psql, sql_literal, upsert_document_chunks


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync curated memory notes into rag_documents")
    parser.add_argument("--source", required=True, help="source config name without .json")
    parser.add_argument("--input", required=True, help="memory json file path")
    parser.add_argument("--namespace", required=True, help="namespace key for storage")
    parser.add_argument("--collection-key", help="stable key for this raw memory collection; defaults to input file stem")
    return parser.parse_args()


def normalize_memories(items: list[dict[str, Any]], source_config: dict[str, Any], collection_key: str) -> list[dict[str, Any]]:
    metadata_defaults = source_config.get("metadata_defaults", {})
    documents: list[dict[str, Any]] = []
    source_key = source_config["source_key"]

    for item in items:
        memory_id = item.get("id")
        if not memory_id:
            raise SystemExit("memory item missing id")

        title = item.get("title") or memory_id
        content = item.get("content") or ""
        metadata = {
            **metadata_defaults,
            "source_type": "memory_bank",
            "knowledge_class": metadata_defaults.get("knowledge_class", "derived"),
            "memory_type": item.get("memory_type", "context"),
            "scope": item.get("scope", "global"),
            "scenario_key": item.get("scenario_key"),
            "tags": item.get("tags", []),
            "stability": item.get("stability", "tentative"),
            "confidence": item.get("confidence", 0.5),
            "last_confirmed_at": item.get("last_confirmed_at"),
            "collection_key": collection_key,
        }
        documents.append(
            {
                "source_key": source_key,
                "namespace_key": None,
                "source_document_id": memory_id,
                "source_path": f"{source_key}/{collection_key}/{metadata['scope']}/{memory_id}",
                "title": title,
                "content": content,
                "content_hash": hashlib.sha256(content.encode("utf-8")).hexdigest(),
                "metadata": metadata,
            }
        )

    return documents


def upsert_documents(namespace_id: int, documents: list[dict[str, Any]]) -> None:
    for document in documents:
        metadata = {
            **document["metadata"],
            "source_key": document["source_key"],
            "source_document_id": document["source_document_id"],
            "namespace_key": document["namespace_key"],
        }
        delete_conflict_query = f"""
        DELETE FROM rag_documents
        WHERE namespace_id = {namespace_id}
          AND source_key = {sql_literal(document['source_key'])}
          AND source_document_id = {sql_literal(document['source_document_id'])}
          AND source_path <> {sql_literal(document['source_path'])};
        """
        run_psql(delete_conflict_query)
        query = f"""
        INSERT INTO rag_documents (
          namespace_id,
          source_key,
          source_document_id,
          source_type,
          record_type,
          knowledge_class,
          domain,
          status,
          source_url,
          source_updated_at,
          path_array,
          parent_source_id,
          is_deleted,
          source_path,
          title,
          content,
          content_hash,
          metadata
        ) VALUES (
          {namespace_id},
          {sql_literal(document['source_key'])},
          {sql_literal(document['source_document_id'])},
          {sql_literal(document['metadata'].get('source_type'))},
          {sql_literal(document['metadata'].get('record_type'))},
          {sql_literal(document['metadata'].get('knowledge_class'))},
          {sql_literal(document['metadata'].get('domain'))},
          {sql_literal(document['metadata'].get('status'))},
          {sql_literal(document['metadata'].get('source_url'))},
          {sql_literal(document['metadata'].get('last_confirmed_at'))},
          {sql_literal(json.dumps(document['metadata'].get('path_array', []), ensure_ascii=False))}::jsonb,
          {sql_literal(document['metadata'].get('parent_source_id'))},
          FALSE,
          {sql_literal(document['source_path'])},
          {sql_literal(document['title'])},
          {sql_literal(document['content'])},
          {sql_literal(document['content_hash'])},
          {sql_literal(json.dumps(metadata, ensure_ascii=False))}::jsonb
        )
        ON CONFLICT (namespace_id, source_path)
        DO UPDATE SET
          source_key = EXCLUDED.source_key,
          source_document_id = EXCLUDED.source_document_id,
          source_type = EXCLUDED.source_type,
          record_type = EXCLUDED.record_type,
          knowledge_class = EXCLUDED.knowledge_class,
          domain = EXCLUDED.domain,
          status = EXCLUDED.status,
          source_url = EXCLUDED.source_url,
          source_updated_at = EXCLUDED.source_updated_at,
          path_array = EXCLUDED.path_array,
          parent_source_id = EXCLUDED.parent_source_id,
          is_deleted = EXCLUDED.is_deleted,
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          content_hash = EXCLUDED.content_hash,
          metadata = EXCLUDED.metadata
        RETURNING id;
        """
        output = run_psql(query, capture_output=True)
        document_id = int(output.splitlines()[0].strip())
        upsert_document_chunks(document_id, document)


def delete_missing_documents(namespace_id: int, source_key: str, collection_key: str, source_paths: list[str]) -> None:
    collection_prefix = f"{source_key}/{collection_key}/"
    if source_paths:
        quoted_paths = ", ".join(sql_literal(path) for path in source_paths)
        query = f"""
        DELETE FROM rag_documents
        WHERE namespace_id = {namespace_id}
          AND source_key = {sql_literal(source_key)}
          AND source_path LIKE {sql_literal(collection_prefix + '%')}
          AND source_path NOT IN ({quoted_paths});
        """
    else:
        query = f"""
        DELETE FROM rag_documents
        WHERE namespace_id = {namespace_id}
          AND source_key = {sql_literal(source_key)}
          AND source_path LIKE {sql_literal(collection_prefix + '%')};
        """
    run_psql(query)


def main() -> None:
    args = parse_args()
    root = Path(__file__).resolve().parent.parent
    load_env(root / ".env")

    source_file = root / "sources" / f"{args.source}.json"
    if not source_file.exists():
        raise SystemExit(f"source config not found: {source_file}")

    input_file = Path(args.input).expanduser().resolve()
    if not input_file.exists():
        raise SystemExit(f"input file not found: {input_file}")

    source_config = json.loads(source_file.read_text(encoding="utf-8"))
    items = json.loads(input_file.read_text(encoding="utf-8"))
    if not isinstance(items, list):
        raise SystemExit("memory input must be a JSON array")
    collection_key = args.collection_key or input_file.stem

    documents = normalize_memories(items, source_config, collection_key)
    for document in documents:
        document["namespace_key"] = args.namespace

    namespace_id = ensure_namespace(args.namespace)
    upsert_documents(namespace_id, documents)
    delete_missing_documents(namespace_id, source_config["source_key"], collection_key, [document["source_path"] for document in documents])

    print(json.dumps({
        "source": args.source,
        "namespace": args.namespace,
        "namespace_id": namespace_id,
        "source_key": source_config["source_key"],
        "collection_key": collection_key,
        "documents_indexed": len(documents),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
