#!/usr/bin/env python3
import argparse
import json
import subprocess
from pathlib import Path

from rag_common import ensure_namespace, load_env, run_psql, sql_literal


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a global RAG job manifest")
    parser.add_argument("--job", required=True, help="path to a job manifest json")
    return parser.parse_args()


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def start_index_run(namespace_key: str, note: str) -> tuple[int, int]:
    namespace_id = ensure_namespace(namespace_key)
    query = f"""
    INSERT INTO index_runs (namespace_id, status, note)
    VALUES ({namespace_id}, 'running', {sql_literal(note)})
    RETURNING id;
    """
    output = run_psql(query, capture_output=True)
    return namespace_id, int(output.splitlines()[0].strip())


def finish_index_run(run_id: int, status: str, note: str | None = None) -> None:
    note_clause = f", note = {sql_literal(note)}" if note is not None else ""
    query = f"""
    UPDATE index_runs
    SET status = {sql_literal(status)},
        finished_at = now()
        {note_clause}
    WHERE id = {run_id};
    """
    run_psql(query)


def main() -> None:
    args = parse_args()
    root = Path(__file__).resolve().parent.parent
    load_env(root / ".env")
    job_path = Path(args.job).expanduser().resolve()
    if not job_path.exists():
        raise SystemExit(f"job file not found: {job_path}")

    job = json.loads(job_path.read_text(encoding="utf-8"))
    if job.get("disabled"):
        reason = job.get("disabled_reason") or "job is disabled"
        raise SystemExit(f"job disabled: {reason}")

    pipeline = job["pipeline"]
    namespace_key = job.get("namespace") or job.get("project") or "workspace"
    _, run_id = start_index_run(namespace_key, f"{job['job_key']}:{pipeline}")

    try:
        if pipeline == "notion_page_tree_sync":
            run([
                "python3",
                str(root / "scripts" / "sync_notion.py"),
                "--source",
                job["source"],
                "--input",
                job["input"],
                "--namespace",
                namespace_key,
            ])
        elif pipeline == "memory_sync":
            run([
                "python3",
                str(root / "scripts" / "sync_memories.py"),
                "--source",
                job["source"],
                "--input",
                job["input"],
                "--namespace",
                namespace_key,
            ])
        elif pipeline == "repo_docs_sync":
            run([
                "python3",
                str(root / "scripts" / "load_docs.py"),
                "--namespace",
                namespace_key,
                "--manifest",
                job["source"],
            ])
        elif pipeline == "workspace_repo_docs_sync":
            run([
                "python3",
                str(root / "scripts" / "sync_workspace_repo_docs.py"),
                "--namespace",
                job.get("namespace", "workspace"),
                "--workspace-root",
                job.get("workspace_root", "/Users/dominic/Workspace"),
            ])
        else:
            raise SystemExit(f"unsupported pipeline: {pipeline}")
    except BaseException as exc:
        finish_index_run(run_id, "failed", str(exc))
        raise

    finish_index_run(run_id, "completed")
    print(json.dumps({
        "job_key": job["job_key"],
        "pipeline": pipeline,
        "run_id": run_id,
        "status": "completed",
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
