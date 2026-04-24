#!/usr/bin/env python3
import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Stage a Notion snapshot JSON into the global RAG raw area")
    parser.add_argument("--source", required=True, help="source config name without .json")
    parser.add_argument("--input", required=True, help="path to exported or pre-fetched Notion JSON")
    parser.add_argument(
        "--allow-empty",
        action="store_true",
        help="allow staging an empty pages payload",
    )
    return parser.parse_args()


def parse_pages_payload(payload: object, *, allow_empty: bool) -> list[dict]:
    if isinstance(payload, list):
        pages = payload
    elif isinstance(payload, dict) and isinstance(payload.get("pages"), list):
        pages = payload["pages"]
    else:
        raise SystemExit("notion snapshot must be a JSON array or an object with a pages array")

    if not allow_empty and not pages:
        raise SystemExit("refusing to stage an empty notion snapshot; rerun with --allow-empty if intentional")

    for page in pages:
        if not isinstance(page, dict):
            raise SystemExit("notion pages array must contain objects")
        if not (page.get("page_id") or page.get("id")):
            raise SystemExit("notion pages must include page_id or id")
    return pages


def main() -> None:
    args = parse_args()
    root = Path(__file__).resolve().parent.parent
    input_path = Path(args.input).expanduser().resolve()
    if not input_path.exists():
        raise SystemExit(f"input file not found: {input_path}")

    payload = json.loads(input_path.read_text(encoding="utf-8"))
    pages = parse_pages_payload(payload, allow_empty=args.allow_empty)
    page_count = len(pages)

    target_dir = root / "data" / "raw" / "notion" / args.source
    target_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    snapshot_path = target_dir / f"{timestamp}.json"
    latest_path = target_dir / "latest.json"

    shutil.copy2(input_path, snapshot_path)
    shutil.copy2(input_path, latest_path)

    print(json.dumps({
        "source": args.source,
        "snapshot": str(snapshot_path),
        "latest": str(latest_path),
        "page_count": page_count,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
