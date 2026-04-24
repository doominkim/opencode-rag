#!/usr/bin/env python3
import argparse
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_INPUT = Path("/Users/dominic/.config/opencode/rag/data/raw/memory/global_preferences.json")
DEFAULT_SOURCE = "memory_bank"
DEFAULT_NAMESPACE = "global-domain-knowledge"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Add one memory note and sync it into the global RAG")
    parser.add_argument("--title", required=True, help="memory title")
    parser.add_argument("--content", required=True, help="memory content")
    parser.add_argument(
        "--memory-type",
        default="context",
        choices=["rule", "preference", "nuance", "context", "decision", "anti_pattern"],
        help="memory category",
    )
    parser.add_argument("--scope", default="global", help="memory scope, e.g. global or project name")
    parser.add_argument("--scenario-key", default="general-memory", help="scenario or theme key")
    parser.add_argument("--tags", nargs="*", default=[], help="tags for retrieval")
    parser.add_argument(
        "--stability",
        default="tentative",
        choices=["stable", "tentative"],
        help="whether this memory is stable or tentative",
    )
    parser.add_argument("--confidence", type=float, default=0.7, help="confidence score between 0 and 1")
    parser.add_argument("--id", help="explicit memory id, auto-generated if omitted")
    parser.add_argument("--input", default=str(DEFAULT_INPUT), help="memory json file path")
    parser.add_argument("--source", default=DEFAULT_SOURCE, help="memory source config name")
    parser.add_argument("--namespace", default=DEFAULT_NAMESPACE, help="target RAG namespace key")
    parser.add_argument(
        "--no-sync",
        action="store_true",
        help="write only to the raw memory file without syncing to the RAG DB",
    )
    return parser.parse_args()


def slugify(value: str) -> str:
    lowered = value.strip().lower()
    ascii_only = re.sub(r"[^a-z0-9가-힣\s_-]", "", lowered)
    collapsed = re.sub(r"[\s_]+", "-", ascii_only).strip("-")
    return collapsed or "memory"


def build_memory_id(args: argparse.Namespace) -> str:
    if args.id:
        return args.id
    return slugify(args.title)


def load_items(input_path: Path) -> list[dict[str, Any]]:
    if not input_path.exists():
        return []
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise SystemExit("memory input file must contain a JSON array")
    return payload


def upsert_item(items: list[dict[str, Any]], item: dict[str, Any]) -> tuple[list[dict[str, Any]], str]:
    for index, existing in enumerate(items):
        if existing.get("id") == item["id"]:
            items[index] = item
            return items, "updated"
    items.append(item)
    return items, "created"


def write_items(input_path: Path, items: list[dict[str, Any]]) -> None:
    input_path.parent.mkdir(parents=True, exist_ok=True)
    input_path.write_text(
        json.dumps(items, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def sync_memory(source: str, input_path: Path, namespace: str) -> None:
    root = Path("/Users/dominic/.config/opencode/rag")
    command = [
        "python3",
        str(root / "scripts" / "sync_memories.py"),
        "--source",
        source,
        "--input",
        str(input_path),
        "--namespace",
        namespace,
        "--collection-key",
        input_path.stem,
    ]
    subprocess.run(command, check=True)


def main() -> None:
    args = parse_args()
    input_path = Path(args.input).expanduser().resolve()
    memory_id = build_memory_id(args)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    item = {
        "id": memory_id,
        "title": args.title,
        "content": args.content,
        "memory_type": args.memory_type,
        "scope": args.scope,
        "scenario_key": args.scenario_key,
        "tags": args.tags,
        "stability": args.stability,
        "confidence": args.confidence,
        "last_confirmed_at": now,
    }

    items = load_items(input_path)
    items, status = upsert_item(items, item)
    write_items(input_path, items)

    if not args.no_sync:
        sync_memory(args.source, input_path, args.namespace)

    print(json.dumps({
        "status": status,
        "memory_id": memory_id,
        "source": args.source,
        "namespace": args.namespace,
        "input": str(input_path),
        "synced": not args.no_sync,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
