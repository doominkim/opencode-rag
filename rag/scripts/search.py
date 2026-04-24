#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
from pathlib import Path

from rag_common import (
    BASE_NAMESPACE_KEY,
    DEFAULT_EMBEDDING_MODEL,
    LOCAL_EMBEDDING_MODEL,
    get_default_search_namespaces,
    load_env,
    load_namespace_policy,
    load_source_policy,
    local_embed_texts,
    openai_embed_texts,
    resolve_search_namespaces,
    sql_literal,
    vector_literal,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Search indexed RAG documents")
    parser.add_argument("--namespace", help="namespace key to search", default=None)
    parser.add_argument("--agent", help="agent namespace to search with base overlay", default=None)
    parser.add_argument("--source", help="optional source_key filter")
    parser.add_argument("--query", required=True, help="search query")
    parser.add_argument("--limit", type=int, default=5, help="top-k results")
    return parser.parse_args()


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"missing required env: {name}")
    return value


def build_like_clause(column: str, query: str) -> str:
    terms = [term for term in query.split() if term]
    if not terms:
        return "FALSE"
    return " OR ".join(
        f"{column} ILIKE '%' || {sql_literal(term)} || '%'"
        for term in terms
    )


def query_embedding_literals(query: str) -> dict[str, str]:
    vectors: dict[str, str] = {}
    local_embeddings = local_embed_texts([query])
    if local_embeddings:
        vectors[LOCAL_EMBEDDING_MODEL] = vector_literal(local_embeddings[0])

    remote_embeddings, resolved_model = openai_embed_texts([query], model=DEFAULT_EMBEDDING_MODEL)
    if remote_embeddings:
        vectors[resolved_model] = vector_literal(remote_embeddings[0])

    return vectors


def authority_boost_case() -> str:
    source_policy = load_source_policy()
    clauses: list[str] = []
    for source in source_policy.get("sources", []):
        authority_level = source.get("authority_level")
        match_keys = source.get("match_keys") or [source.get("source_key")]
        match_keys = [key for key in match_keys if key]
        if not match_keys or not isinstance(authority_level, (int, float)):
            continue
        boost = round(float(authority_level) / 2000.0, 4)
        match_sql = ", ".join(sql_literal(key) for key in match_keys)
        clauses.append(f"WHEN d.source_key = ANY(ARRAY[{match_sql}]) THEN {boost}")

    clauses.append("WHEN d.knowledge_class = 'derived' THEN 0.01")
    clauses_sql = "\n      ".join(clauses)
    return f"""
    CASE
      {clauses_sql}
      ELSE 0
    END
    """.strip()


def namespace_bias_case() -> str:
    namespace_policy = load_namespace_policy()
    bias_map = namespace_policy.get("namespace_bias", {})
    clauses = [
        f"WHEN n.namespace_key = {sql_literal(namespace_key)} THEN {float(bias)}"
        for namespace_key, bias in bias_map.items()
        if isinstance(bias, (int, float))
    ]
    clauses_sql = "\n      ".join(clauses)
    if not clauses_sql:
        return "0"
    return f"""
    CASE
      {clauses_sql}
      ELSE 0
    END
    """.strip()


def vector_score_sql(query_vectors: dict[str, str]) -> str:
    clauses = [
        f"WHEN c.embedding_model = {sql_literal(model)} THEN COALESCE(1 - (c.embedding <=> {vector}), 0)"
        for model, vector in query_vectors.items()
    ]
    if not clauses:
        return "0"
    return "CASE " + " ".join(clauses) + " ELSE 0 END"


def vector_candidate_sql(query_vectors: dict[str, str], threshold: float = 0.05) -> str:
    if not query_vectors:
        return "FALSE"
    return " OR ".join(
        f"(c.embedding_model = {sql_literal(model)} AND (1 - (c.embedding <=> {vector})) > {threshold})"
        for model, vector in query_vectors.items()
    )


def run_search(namespace_keys: list[str], source_key: str | None, query: str, limit: int) -> list[dict]:
    host = require_env("PGHOST")
    port = require_env("PGPORT")
    database = require_env("PGDATABASE")
    user = require_env("PGUSER")
    password = require_env("PGPASSWORD")

    query_vectors = query_embedding_literals(query)
    namespace_list = ", ".join(sql_literal(namespace) for namespace in namespace_keys)
    namespace_filter = f"n.namespace_key = ANY(ARRAY[{namespace_list}])"
    source_filter = f"AND d.source_key = {sql_literal(source_key)}" if source_key else ""
    vector_score = vector_score_sql(query_vectors)
    text_score = (
        f"COALESCE(ts_rank_cd(to_tsvector('simple', COALESCE(d.title, '') || ' ' || c.content), plainto_tsquery('simple', {sql_literal(query)})), 0)"
    )
    text_filter = f"to_tsvector('simple', COALESCE(d.title, '') || ' ' || c.content) @@ plainto_tsquery('simple', {sql_literal(query)})"
    like_filter = " OR ".join(
        [
            build_like_clause("d.source_path", query),
            build_like_clause("COALESCE(d.title, '')", query),
            build_like_clause("c.content", query),
        ]
    )
    candidate_filter = f"({text_filter} OR {like_filter})"
    vector_candidate = vector_candidate_sql(query_vectors)
    if vector_candidate != "FALSE":
        candidate_filter = f"({candidate_filter} OR {vector_candidate})"
    authority_boost = authority_boost_case()
    namespace_bias = namespace_bias_case()

    sql = f"""
    WITH scored AS (
      SELECT
        n.namespace_key AS namespace_key,
        d.source_key,
        d.source_document_id,
        d.source_type,
        d.record_type,
        d.knowledge_class,
        d.source_path,
        d.title,
        c.chunk_index,
        COALESCE(d.metadata->>'git_common_dir', d.source_key) AS dedupe_root,
        LEFT(REGEXP_REPLACE(c.content, E'[\\n\\r\\t]+', ' ', 'g'), 240) AS snippet,
        ({vector_score}) AS vector_score,
        ({text_score}) AS text_score,
        CASE
          WHEN d.source_path LIKE '%.github/workflows/%' THEN 0.03
          WHEN d.source_path LIKE '%/AGENTS.md' THEN 0.02
          WHEN d.source_path LIKE '%/README%' THEN 0.01
          ELSE 0
        END AS document_boost,
        CASE
          WHEN COALESCE(d.metadata->>'is_worktree', 'false') = 'true' THEN -0.01
          ELSE 0
        END AS worktree_penalty,
        ({authority_boost}) AS authority_boost,
        ({namespace_bias}) AS namespace_bias
      FROM rag_chunks c
      INNER JOIN rag_documents d ON d.id = c.document_id
        INNER JOIN namespaces n ON n.id = d.namespace_id
      WHERE {namespace_filter}
        {source_filter}
        AND {candidate_filter}
    ), ranked AS (
      SELECT
        *,
        ROUND((vector_score * 0.7 + text_score * 0.3 + document_boost + worktree_penalty + authority_boost + namespace_bias)::numeric, 4) AS rank,
        ROW_NUMBER() OVER (
          PARTITION BY dedupe_root, COALESCE(source_document_id, source_path)
          ORDER BY (vector_score * 0.7 + text_score * 0.3 + document_boost + worktree_penalty + authority_boost + namespace_bias) DESC,
                   source_path ASC,
                   chunk_index ASC
        ) AS dedupe_rank
      FROM scored
    )
    SELECT COALESCE(json_agg(row_to_json(result_rows)), '[]'::json)::text
    FROM (
      SELECT *
      FROM ranked
      WHERE dedupe_rank = 1
      ORDER BY rank DESC, namespace_key ASC, source_path ASC, chunk_index ASC
      LIMIT {limit}
    ) AS result_rows;
    """

    env = dict(os.environ)
    env["PGPASSWORD"] = password
    completed = subprocess.run(
        [
            "psql",
            "-v",
            "ON_ERROR_STOP=1",
            "-Atq",
            "-h",
            host,
            "-p",
            port,
            "-U",
            user,
            "-d",
            database,
            "-c",
            sql,
        ],
        check=True,
        text=True,
        capture_output=True,
        env=env,
    )
    output = completed.stdout.strip() or "[]"
    return json.loads(output)


def main() -> None:
    args = parse_args()
    root = Path(__file__).resolve().parent.parent
    load_env(root / ".env")
    namespace_keys = resolve_search_namespaces(args.namespace, args.agent)
    results = run_search(namespace_keys, args.source, args.query, args.limit)
    print(json.dumps({
        "namespace": args.namespace,
        "resolved_namespaces": namespace_keys,
        "default_namespaces": get_default_search_namespaces(),
        "agent": args.agent,
        "query": args.query,
        "count": len(results),
        "results": results,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
