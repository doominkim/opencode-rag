// @ts-nocheck

export const DESTRUCTIVE_PATTERNS = [
  { name: "rm-rf", re: /\brm\s+-[a-zA-Z]*[rRfF][a-zA-Z]*/, reason: "재귀 강제 삭제" },
  { name: "git-push-force", re: /\bgit\s+push\s+(--force\b|-f\b)/, reason: "force push" },
  { name: "git-reset-hard", re: /\bgit\s+reset\s+--hard\b/, reason: "작업 폐기 가능" },
  { name: "git-branch-delete", re: /\bgit\s+branch\s+-D\b/, reason: "브랜치 강제 삭제" },
  { name: "git-clean-force", re: /\bgit\s+clean\s+-[a-zA-Z]*f/, reason: "untracked 강제 삭제" },
  { name: "rag-bootstrap", re: /\brag\/scripts\/bootstrap\.sh\b/, reason: "RAG DB 초기화" },
  { name: "rag-sync-workspace", re: /\brag\/scripts\/sync_workspace_repo_docs\.py\b/, reason: "RAG sync — 누락 데이터 삭제 가능" },
  { name: "rag-sync-notion", re: /\brag\/scripts\/sync_notion\.py\b/, reason: "RAG sync — 누락 데이터 삭제 가능" },
  { name: "rag-sync-memories", re: /\brag\/scripts\/sync_memories\.py\b/, reason: "RAG sync — 누락 데이터 삭제 가능" },
  { name: "rag-load-docs", re: /\brag\/scripts\/load_docs\.py\b/, reason: "RAG 적재 — 덮어쓰기" },
  { name: "drop-table", re: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, reason: "DB 객체 삭제" },
  { name: "truncate", re: /\bTRUNCATE\s+TABLE\b/i, reason: "테이블 비우기" },
]

export function detectDestructive(command) {
  for (const p of DESTRUCTIVE_PATTERNS) {
    if (p.re.test(command)) return p
  }
  return null
}
