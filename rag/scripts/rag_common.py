#!/usr/bin/env python3
import base64
import hashlib
import json
import os
import re
import subprocess
import urllib.request
from pathlib import Path
from typing import Any


BASE_NAMESPACE_KEY = "rag-base"
DEFAULT_SEARCH_NAMESPACES = ["workspace", "global-domain-knowledge", BASE_NAMESPACE_KEY]
DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
LOCAL_EMBEDDING_MODEL = "local-hash-1536"
ROOT_PATH = Path(__file__).resolve().parent.parent


def load_env(env_path: Path) -> None:
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ[key] = value


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"missing required env: {name}")
    return value


def sql_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def vector_literal(values: list[float]) -> str:
    return "'" + json.dumps(values, ensure_ascii=False, separators=(",", ":")) + "'::vector"


def psql_base_command() -> list[str]:
    host = require_env("PGHOST")
    port = require_env("PGPORT")
    database = require_env("PGDATABASE")
    user = require_env("PGUSER")
    password = require_env("PGPASSWORD")
    os.environ["PGPASSWORD"] = password
    return [
        "psql",
        "-v",
        "ON_ERROR_STOP=1",
        "-h",
        host,
        "-p",
        port,
        "-U",
        user,
        "-d",
        database,
    ]


def run_psql(query: str, *, capture_output: bool = False) -> str:
    command = psql_base_command() + (["-Atq", "-c", query] if capture_output else ["-c", query])
    completed = subprocess.run(
        command,
        check=True,
        text=True,
        capture_output=capture_output,
    )
    return completed.stdout.strip() if capture_output else ""


def ensure_namespace(namespace_key: str) -> int:
    query = f"""
    INSERT INTO namespaces (namespace_key, name, root_path)
    VALUES ({sql_literal(namespace_key)}, {sql_literal(namespace_key)}, NULL)
    ON CONFLICT (namespace_key)
    DO UPDATE SET name = EXCLUDED.name
    RETURNING id;
    """
    output = run_psql(query, capture_output=True)
    return int(output.splitlines()[0].strip())


def split_text_into_chunks(text: str, *, max_chars: int = 1200) -> list[str]:
    normalized = text.replace("\r\n", "\n").strip()
    if not normalized:
        return []

    paragraphs = [paragraph.strip() for paragraph in normalized.split("\n\n") if paragraph.strip()]
    if not paragraphs:
        paragraphs = [normalized]

    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        candidate = paragraph if not current else f"{current}\n\n{paragraph}"
        if len(candidate) <= max_chars:
            current = candidate
            continue

        if current:
            chunks.append(current)
            current = ""

        if len(paragraph) <= max_chars:
            current = paragraph
            continue

        start = 0
        while start < len(paragraph):
            chunks.append(paragraph[start : start + max_chars])
            start += max_chars

    if current:
        chunks.append(current)

    return chunks


def build_chunks(document: dict[str, Any]) -> list[dict[str, Any]]:
    content = document.get("content") or ""
    chunks = split_text_into_chunks(content)
    if not chunks and document.get("title"):
        chunks = [document["title"]]

    return [
        {
            "chunk_index": index,
            "content": chunk,
            "token_count": max(1, len(chunk.split())),
            "metadata": {
                "source_key": document.get("source_key"),
                "source_document_id": document.get("source_document_id"),
                "namespace_key": document.get("namespace_key"),
                "record_type": document.get("metadata", {}).get("record_type"),
                "source_type": document.get("metadata", {}).get("source_type"),
            },
        }
        for index, chunk in enumerate(chunks)
    ]


def local_embed_texts(texts: list[str], *, dimensions: int = 1536) -> list[list[float]]:
    embeddings: list[list[float]] = []
    for text in texts:
        vector = [0.0] * dimensions
        tokens = re.findall(r"[0-9A-Za-z가-힣]+", text.lower())
        if not tokens:
            tokens = [text.lower()]

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % dimensions
            direction = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += direction

        norm = sum(value * value for value in vector) ** 0.5
        if norm:
            vector = [value / norm for value in vector]
        embeddings.append(vector)

    return embeddings


def openai_embed_texts(texts: list[str], *, model: str = DEFAULT_EMBEDDING_MODEL) -> tuple[list[list[float]], str]:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return local_embed_texts(texts), LOCAL_EMBEDDING_MODEL

    base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
    payload = json.dumps({"model": model, "input": texts}, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/embeddings",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = json.loads(response.read().decode("utf-8"))
    except Exception:
        return local_embed_texts(texts), LOCAL_EMBEDDING_MODEL

    return [item["embedding"] for item in sorted(body["data"], key=lambda row: row["index"])], model


def upsert_document_chunks(document_id: int, document: dict[str, Any], *, embedding_model: str = DEFAULT_EMBEDDING_MODEL) -> int:
    chunks = build_chunks(document)

    if not chunks:
        run_psql(f"DELETE FROM rag_chunks WHERE document_id = {document_id};")
        return 0

    embeddings, resolved_model = openai_embed_texts([chunk["content"] for chunk in chunks], model=embedding_model)
    run_psql(f"DELETE FROM rag_chunks WHERE document_id = {document_id};")
    inserted = 0

    for chunk, embedding in zip(chunks, embeddings, strict=True):
        query = f"""
        INSERT INTO rag_chunks (
          document_id,
          chunk_index,
          content,
          token_count,
          embedding,
          embedding_model,
          metadata
        ) VALUES (
          {document_id},
          {chunk['chunk_index']},
          {sql_literal(chunk['content'])},
          {chunk['token_count']},
          {vector_literal(embedding)},
          {sql_literal(resolved_model)},
          {sql_literal(json.dumps(chunk['metadata'], ensure_ascii=False))}::jsonb
        )
        ON CONFLICT (document_id, chunk_index)
        DO UPDATE SET
          content = EXCLUDED.content,
          token_count = EXCLUDED.token_count,
          embedding = EXCLUDED.embedding,
          embedding_model = EXCLUDED.embedding_model,
          metadata = EXCLUDED.metadata;
        """
        run_psql(query)
        inserted += 1

    return inserted


def resolve_search_namespaces(namespace: str | None, agent: str | None) -> list[str]:
    default_namespaces = get_default_search_namespaces()
    if agent:
        resolved = [*default_namespaces, agent]
        return list(dict.fromkeys(resolved))
    if namespace:
        return [namespace]
    return default_namespaces


def load_json_config(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise SystemExit(f"invalid json config: {path}")
    return payload


def load_namespace_policy() -> dict[str, Any]:
    return load_json_config(ROOT_PATH / "namespace-policy.json")


def load_source_policy() -> dict[str, Any]:
    return load_json_config(ROOT_PATH / "source-policy.json")


def get_default_search_namespaces() -> list[str]:
    policy = load_namespace_policy()
    namespaces = policy.get("default_search_namespaces")
    if isinstance(namespaces, list):
        filtered = [namespace for namespace in namespaces if isinstance(namespace, str) and namespace]
        if filtered:
            return filtered
    return DEFAULT_SEARCH_NAMESPACES
