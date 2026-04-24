#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any

from load_docs import DEFAULT_EXCLUDE, DEFAULT_INCLUDE, build_document_row, collect_files, index_documents
from rag_common import load_env


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync Workspace repo/worktree docs into rag_documents")
    parser.add_argument("--namespace", default="workspace", help="namespace key for storage")
    parser.add_argument("--workspace-root", default="/Users/dominic/Workspace", help="Workspace root directory")
    parser.add_argument(
        "--allow-names",
        nargs="*",
        help="optional basenames to include; omit to scan every git repo/worktree under workspace root",
    )
    return parser.parse_args()


def git_value(repo_path: Path, *args: str) -> str:
    completed = subprocess.run(
        ["git", "-C", str(repo_path), *args],
        check=True,
        text=True,
        capture_output=True,
    )
    return completed.stdout.strip()


def slugify(value: str) -> str:
    lowered = value.strip().lower()
    normalized = re.sub(r"[^a-z0-9._-]+", "-", lowered)
    normalized = re.sub(r"-+", "-", normalized).strip("-")
    return normalized or "workspace-repo"


def stable_repo_key(entry: dict[str, Any]) -> str:
    git_dir = entry["git_dir"]
    digest = hashlib.sha1(str(git_dir).encode("utf-8")).hexdigest()[:10]
    return f"workspace-{slugify(entry['basename'])}-{digest}"


def discover_repo_entries(workspace_root: Path, allow_names: set[str] | None) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    seen_paths: set[Path] = set()
    for current_root, dirnames, filenames in os.walk(workspace_root):
        dirnames[:] = [name for name in dirnames if name not in {".git", "node_modules", "dist", "coverage"}]
        current_path = Path(current_root)
        has_git = ".git" in dirnames or ".git" in filenames
        if not has_git:
            continue
        if allow_names and current_path.name not in allow_names:
            continue
        resolved_path = current_path.resolve()
        if resolved_path in seen_paths:
            continue
        seen_paths.add(resolved_path)

        repo_root = Path(git_value(resolved_path, "rev-parse", "--show-toplevel")).resolve()
        git_common_dir_raw = git_value(resolved_path, "rev-parse", "--git-common-dir")
        git_common_dir = Path(git_common_dir_raw)
        if not git_common_dir.is_absolute():
            git_common_dir = (resolved_path / git_common_dir).resolve()
        else:
            git_common_dir = git_common_dir.resolve()
        git_dir_raw = git_value(resolved_path, "rev-parse", "--absolute-git-dir")
        git_dir = Path(git_dir_raw).resolve()

        primary_root = git_common_dir.parent.resolve()
        entries.append(
            {
                "path": resolved_path,
                "repo_root": repo_root,
                "git_dir": git_dir,
                "git_common_dir": git_common_dir,
                "primary_root": primary_root,
                "is_worktree": primary_root != resolved_path,
                "basename": resolved_path.name,
            }
        )
    return entries


def build_repo_documents(entry: dict[str, Any], namespace: str) -> tuple[str, list[dict[str, Any]]]:
    root_path = entry["path"]
    source_key = stable_repo_key(entry)
    file_paths = collect_files(root_path, DEFAULT_INCLUDE, DEFAULT_EXCLUDE)
    documents: list[dict[str, Any]] = []
    primary_agents = entry["primary_root"] / "AGENTS.md"
    primary_agents_content = None
    if primary_agents.exists():
        primary_agents_content = primary_agents.read_text(encoding="utf-8", errors="ignore")

    for path in file_paths:
        relative_path = path.relative_to(root_path).as_posix()
        if relative_path == "AGENTS.md" and entry["is_worktree"] and primary_agents_content is not None:
            current_agents_content = path.read_text(encoding="utf-8", errors="ignore")
            if current_agents_content == primary_agents_content:
                continue

        document = build_document_row(root_path, path)
        document["source_key"] = source_key
        document["metadata"] = {
            **document["metadata"],
            "workspace_key": namespace,
            "repo_key": slugify(entry["repo_root"].name),
            "repo_root": str(entry["repo_root"]),
            "worktree_root": str(root_path),
            "git_dir": str(entry["git_dir"]),
            "git_common_dir": str(entry["git_common_dir"]),
            "is_worktree": entry["is_worktree"],
        }
        documents.append(document)

    return source_key, documents


def main() -> None:
    args = parse_args()
    root = Path(__file__).resolve().parent.parent
    load_env(root / ".env")

    workspace_root = Path(args.workspace_root).expanduser().resolve()
    if not workspace_root.exists():
        raise SystemExit(f"workspace root not found: {workspace_root}")

    allow_names = set(args.allow_names) if args.allow_names else None
    entries = discover_repo_entries(workspace_root, allow_names)
    results: list[dict[str, Any]] = []

    for entry in entries:
        source_key, documents = build_repo_documents(entry, args.namespace)
        result = index_documents(args.namespace, source_key, documents)
        result.pop("documents", None)
        result["repo_root"] = str(entry["repo_root"])
        result["worktree_root"] = str(entry["path"])
        result["is_worktree"] = entry["is_worktree"]
        results.append(result)

    print(
        json.dumps(
            {
                "namespace": args.namespace,
                "workspace_root": str(workspace_root),
                "repo_count": len(results),
                "documents_indexed": sum(item["documents_indexed"] for item in results),
                "results": results,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
