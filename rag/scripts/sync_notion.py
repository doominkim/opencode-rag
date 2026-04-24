#!/usr/bin/env python3
import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from rag_common import ensure_namespace, load_env, run_psql, sql_literal, upsert_document_chunks


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync Notion page tree documents into rag_documents")
    parser.add_argument("--source", required=True, help="source config file name without .json")
    parser.add_argument("--namespace", required=True, help="namespace key for storage")
    parser.add_argument(
        "--input",
        required=True,
        help="Notion export JSON path. MVP에서는 page tree를 JSON snapshot으로 받아 적재합니다.",
    )
    parser.add_argument(
        "--allow-empty",
        action="store_true",
        help="allow empty page snapshots and delete the existing source set",
    )
    return parser.parse_args()


def parse_pages_payload(payload: Any, *, allow_empty: bool) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        pages = payload
    elif isinstance(payload, dict) and isinstance(payload.get("pages"), list):
        pages = payload["pages"]
    else:
        raise SystemExit("notion input must be a JSON array or an object with a pages array")

    if not allow_empty and not pages:
        raise SystemExit("refusing to sync empty notion pages; rerun with --allow-empty if deletion is intentional")

    for page in pages:
        if not isinstance(page, dict):
            raise SystemExit("notion pages array must contain objects")
    return pages


def normalize_notion_pages(
    pages: list[dict[str, Any]],
    source_config: dict[str, Any],
) -> list[dict[str, Any]]:
    documents: list[dict[str, Any]] = []
    source_key = source_config["source_key"]
    metadata_defaults = source_config.get("metadata_defaults", {})

    for page in pages:
        title = page.get("title") or page.get("name") or "Untitled"
        path_array = page.get("path_array") or [title]
        content_blocks = page.get("content_blocks")
        canonical_text = ""
        if isinstance(content_blocks, list) and content_blocks:
            canonical_text = "\n\n".join(str(block).strip() for block in content_blocks if str(block).strip())
        if not canonical_text:
            canonical_text = str(page.get("content") or "").strip()

        metadata = {
            "source_type": "notion",
            "workspace": source_config.get("workspace"),
            "path_array": path_array,
            "parent_source_id": page.get("parent_page_id"),
            "record_type": metadata_defaults.get("record_type", "page"),
            "knowledge_class": metadata_defaults.get("knowledge_class", "source"),
            "chunk_strategy": metadata_defaults.get("chunk_strategy", "section"),
            "document_type": page.get("document_type") or page.get("type") or "page",
            "domain": page.get("domain") or source_config.get("roots", [{}])[0].get("domain"),
            "status": page.get("status") or source_config.get("roots", [{}])[0].get("status"),
            "source_url": page.get("url"),
            "source_updated_at": page.get("last_edited_time") or page.get("updated_at"),
        }

        source_document_id = page.get("page_id") or page.get("id")
        if not source_document_id:
            raise SystemExit("notion input row is missing page_id/id")

        documents.append(
            {
                "source_key": source_key,
                "source_path": f"{source_key}/{'/'.join(path_array)}",
                "title": title,
                "content": canonical_text,
                "content_hash": hashlib.sha256(canonical_text.encode("utf-8")).hexdigest(),
                "metadata": metadata,
                "source_document_id": source_document_id,
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
          {sql_literal(document['metadata'].get('source_updated_at'))},
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


def delete_missing_documents(namespace_id: int, source_key: str, source_paths: list[str]) -> None:
    if source_paths:
        quoted_paths = ", ".join(sql_literal(path) for path in source_paths)
        query = f"""
        DELETE FROM rag_documents
        WHERE namespace_id = {namespace_id}
          AND source_key = {sql_literal(source_key)}
          AND source_path NOT IN ({quoted_paths});
        """
    else:
        query = f"DELETE FROM rag_documents WHERE namespace_id = {namespace_id} AND source_key = {sql_literal(source_key)};"
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
    payload = json.loads(input_file.read_text(encoding="utf-8"))
    pages = parse_pages_payload(payload, allow_empty=args.allow_empty)

    documents = normalize_notion_pages(pages, source_config)
    for document in documents:
        document["namespace_key"] = args.namespace

    namespace_id = ensure_namespace(args.namespace)
    upsert_documents(namespace_id, documents)
    delete_missing_documents(namespace_id, source_config["source_key"], [document["source_path"] for document in documents])

    print(
        json.dumps(
                {
                    "source": args.source,
                    "namespace": args.namespace,
                    "namespace_id": namespace_id,
                    "source_key": source_config["source_key"],
                    "documents_indexed": len(documents),
                },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
