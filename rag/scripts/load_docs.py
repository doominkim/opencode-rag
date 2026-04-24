#!/usr/bin/env python3
import argparse
import glob
import hashlib
import json
from pathlib import Path
from typing import Any

from rag_common import ensure_namespace, load_env, run_psql, sql_literal, upsert_document_chunks


DEFAULT_INCLUDE = [
    "AGENTS.md",
    "README*",
    "nest-cli.json",
    "package.json",
    ".github/workflows/**/*.yml",
    "apps/*/src/main.ts",
    "apps/*/src/**/*.module.ts",
    "libs/*/src/**/*.module.ts",
    "docs/**/*.md",
]

DEFAULT_EXCLUDE = [
    ".git/**",
    "env/**",
    ".env*",
    "node_modules/**",
    "dist/**",
    "coverage/**",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load source documents into rag_documents")
    parser.add_argument("--namespace", required=True, help="namespace key for storage")
    parser.add_argument("--manifest", help="source manifest name without .json", default=None)
    return parser.parse_args()


def collect_files(root_path: Path, include: list[str], exclude: list[str]) -> list[Path]:
    included: set[Path] = set()
    for pattern in include:
        for match in glob.glob(str(root_path / pattern), recursive=True):
            path = Path(match)
            if path.is_file():
                included.add(path.resolve())

    excluded: set[Path] = set()
    for pattern in exclude:
        for match in glob.glob(str(root_path / pattern), recursive=True):
            path = Path(match)
            if path.is_file():
                excluded.add(path.resolve())

    return sorted(path for path in included if path not in excluded)


def build_document_row(root_path: Path, file_path: Path) -> dict[str, Any]:
    content = file_path.read_text(encoding="utf-8", errors="ignore")
    relative_path = file_path.relative_to(root_path).as_posix()
    metadata = {
        "relative_path": relative_path,
        "extension": file_path.suffix,
        "top_level": relative_path.split("/", 1)[0],
        "source_type": "file/text",
        "record_type": "file",
        "knowledge_class": "source",
    }
    return {
        "namespace_key": None,
        "source_key": None,
        "source_document_id": relative_path,
        "relative_path": relative_path,
        "title": file_path.name,
        "content": content,
        "content_hash": hashlib.sha256(content.encode("utf-8")).hexdigest(),
        "metadata": metadata,
    }


def upsert_documents(namespace_id: int, source_key: str, documents: list[dict[str, Any]]) -> None:
    for document in documents:
        resolved_source_key = document.get("source_key") or source_key
        metadata = {
            **document["metadata"],
            "source_key": resolved_source_key,
            "source_document_id": document["source_document_id"],
            "namespace_key": document["namespace_key"],
        }
        source_path = f"repo_docs/{resolved_source_key}/{document['relative_path']}"
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
          {sql_literal(resolved_source_key)},
          {sql_literal(document['source_document_id'])},
          {sql_literal(document['metadata'].get('source_type'))},
          {sql_literal(document['metadata'].get('record_type'))},
          {sql_literal(document['metadata'].get('knowledge_class'))},
          NULL,
          NULL,
          NULL,
          NULL,
          {sql_literal(json.dumps([resolved_source_key, document['relative_path']], ensure_ascii=False))}::jsonb,
          NULL,
          FALSE,
          {sql_literal(source_path)},
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
          path_array = EXCLUDED.path_array,
          is_deleted = EXCLUDED.is_deleted,
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          content_hash = EXCLUDED.content_hash,
          metadata = EXCLUDED.metadata
        RETURNING id;
        """
        output = run_psql(query, capture_output=True)
        document_id = int(output.splitlines()[0].strip())
        document["source_key"] = resolved_source_key
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


def index_documents(
    namespace: str,
    source_key: str,
    documents: list[dict[str, Any]],
    *,
    cleanup_source_keys: list[str] | None = None,
) -> dict[str, Any]:
    namespace_id = ensure_namespace(namespace)
    for document in documents:
        document["namespace_key"] = namespace
        document["source_key"] = document.get("source_key") or source_key

    upsert_documents(namespace_id, source_key, documents)
    source_paths = [f"repo_docs/{source_key}/{document['relative_path']}" for document in documents]
    cleanup_keys = [source_key, *(cleanup_source_keys or [])]
    for cleanup_key in dict.fromkeys(cleanup_keys):
        delete_missing_documents(namespace_id, cleanup_key, source_paths if cleanup_key == source_key else [])
    return {
        "namespace": namespace,
        "namespace_id": namespace_id,
        "source_key": source_key,
        "documents_indexed": len(documents),
        "documents": documents,
    }


def load_manifest_documents(config: dict[str, Any]) -> tuple[str, list[str], list[dict[str, Any]]]:
    source_key = config.get("source_key") or config.get("namespace_key") or config.get("project_key")
    root_path = Path(config["root_path"]).expanduser().resolve()
    include = config.get("include", DEFAULT_INCLUDE)
    exclude = config.get("exclude", DEFAULT_EXCLUDE)
    file_paths = collect_files(root_path, include, exclude)
    documents = [build_document_row(root_path, path) for path in file_paths]
    metadata_defaults = config.get("metadata_defaults", {})
    cleanup_source_keys = [key for key in config.get("cleanup_source_keys", []) if key and key != source_key]

    for document in documents:
        document["source_key"] = source_key
        document["metadata"] = {
            **metadata_defaults,
            **document["metadata"],
        }

    return source_key, cleanup_source_keys, documents


def main() -> None:
    args = parse_args()
    root = Path(__file__).resolve().parent.parent
    load_env(root / ".env")

    manifest_name = args.manifest or args.namespace
    source_file = root / "sources" / f"{manifest_name}.json"
    if not source_file.exists():
        raise SystemExit(f"source manifest not found: {source_file}")

    config = json.loads(source_file.read_text(encoding="utf-8"))
    source_key, cleanup_source_keys, documents = load_manifest_documents(config)
    print(json.dumps(index_documents(args.namespace, source_key, documents, cleanup_source_keys=cleanup_source_keys), ensure_ascii=False))


if __name__ == "__main__":
    main()
