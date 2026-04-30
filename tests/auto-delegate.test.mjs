import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

function loadPatterns() {
  const source = readFileSync("plugin/auto-delegate/lib/patterns.ts", "utf8")
    .replace(/^\/\/ @ts-nocheck\n+/, "")
    .replace("export const DESTRUCTIVE_PATTERNS =", "const DESTRUCTIVE_PATTERNS =")
    .replace("export function detectDestructive", "function detectDestructive")

  return Function(`${source}\nreturn { DESTRUCTIVE_PATTERNS, detectDestructive }`)()
}

function loadAgents() {
  const source = readFileSync("plugin/auto-delegate/lib/agents.ts", "utf8")
    .replace(/^\/\/ @ts-nocheck\n+/, "")
    .replace("export const AGENTS =", "const AGENTS =")

  return Function(`${source}\nreturn { AGENTS }`)().AGENTS
}

function loadRouter(AGENTS) {
  const source = readFileSync("plugin/auto-delegate/lib/router.ts", "utf8")
    .replace(/^\/\/ @ts-nocheck\n+/, "")
    .replace('import { AGENTS } from "./agents.ts"\n', "")
    .replaceAll("export function", "function")

  return Function("AGENTS", `${source}\nreturn { matchAgent, route }`)(AGENTS)
}

function loadPresets() {
  const source = readFileSync("plugin/auto-delegate/lib/presets.ts", "utf8")
    .replace(/^\/\/ @ts-nocheck\n+/, "")
    .replace("export const PRESETS =", "const PRESETS =")
    .replace("export const AGENT_PRESET =", "const AGENT_PRESET =")
    .replace("export function presetForAgent", "function presetForAgent")

  return Function(`${source}\nreturn { PRESETS, AGENT_PRESET, presetForAgent }`)()
}

function loadPermissionGate(detectDestructive) {
  const source = readFileSync("plugin/auto-delegate/hooks/permission-gate.ts", "utf8")
    .replace(/^\/\/ @ts-nocheck\n+/, "")
    .replace('import { logger } from "../lib/logger.ts"\n', "const logger = { warn: async () => {} }\n")
    .replace('import { detectDestructive } from "../lib/patterns.ts"\n', "")
    .replaceAll("export function", "function")
    .replaceAll("export async function", "async function")

  return Function("detectDestructive", `${source}\nreturn { permissionCommandCandidates, isBashPermission, findDestructivePermission, permissionGate }`)(detectDestructive)
}

function loadNotifyHook() {
  const source = readFileSync("plugin/auto-delegate/hooks/notify.ts", "utf8")
    .replace(/^\/\/ @ts-nocheck\n+/, "")
    .replace('import { logger } from "../lib/logger.ts"\n', "const logger = { warn: async () => {}, info: async () => {} }\n")
    .replace('import { compact, notify } from "../lib/notify.ts"\n', "const notifications = []\nconst compact = (value, fallback = '상태 확인') => String(value ?? '').replace(/\\s+/g, ' ').trim() || fallback\nconst notify = async (...args) => { notifications.push(args) }\n")
    .replaceAll("export async function", "async function")

  return Function(`${source}\nreturn { isGitPushCommand, isGitPushSuccessOutput, notifyOnTextComplete, notifications }`)()
}

test("detectDestructive catches high-risk commands", () => {
  const { detectDestructive } = loadPatterns()
  const cases = [
    ["rm -rf /tmp/opencode-test", "rm-rf"],
    ["git push --force origin master", "git-push-force"],
    ["git reset --hard HEAD", "git-reset-hard"],
    ["git checkout -f main", "git-checkout-force"],
    ["git switch --force main", "git-switch-force"],
    ["git restore .", "git-restore"],
    ["find . -name '*.tmp' -delete", "find-delete"],
    ["psql -c \"DELETE FROM users\"", "delete-from"],
    ["python3 rag/scripts/add_memory.py --title x --content y", "rag-add-memory"],
    ["python3 rag/scripts/add_memory.py --title x --content y --no-sync", "rag-add-memory"],
    ["python3 rag/scripts/sync_memories.py --source memory_bank --input x --namespace global-domain-knowledge", "rag-sync-memories"],
  ]

  for (const [command, expected] of cases) {
    assert.equal(detectDestructive(command)?.name, expected, command)
  }
})

test("detectDestructive leaves read-only commands alone", () => {
  const { detectDestructive } = loadPatterns()
  const cases = [
    "git status --short",
    "git diff --stat",
    "python3 rag/scripts/search.py --namespace workspace --query test --limit 5",
    "rg -n 'where\\(`|andWhere\\(`' apps/admin/src",
  ]

  for (const command of cases) {
    assert.equal(detectDestructive(command), null, command)
  }
})

test("router maps common prompts to expected agents", () => {
  const router = loadRouter(loadAgents())

  assert.equal(router.route("커밋 메시지 만들어줘").agents[0]?.agent, "commit-message")
  assert.equal(router.route("schema migration index 검토").agents[0]?.agent, "db-designer")
  assert.equal(router.route("BISlackCronService Slack 알림 집계 수정").agents[0]?.agent, "backend")
  assert.equal(router.route("service layer domain logic 추가").agents[0]?.agent, "backend")
  assert.equal(router.route("review service changes").agents[0]?.agent, "reviewer")
  assert.equal(router.route("service endpoint 구현").agents[0]?.agent, "api")
  assert.equal(router.route("service migration 검토").agents[0]?.agent, "db-designer")
  assert.equal(router.route("@reviewer 이 변경 검토해줘").confidence, "explicit")
  assert.equal(router.route("@backend 배치 작업 구현").confidence, "explicit")
  assert.equal(router.route("grep으로 위치 찾아줘").agents[0]?.agent, "explore")
})

test("backend uses deep-think preset", () => {
  const { presetForAgent } = loadPresets()
  assert.equal(presetForAgent("backend")?.name, "deep-think")
})

test("permissionGate detects destructive commands across SDK input shapes", async () => {
  const { detectDestructive } = loadPatterns()
  const { findDestructivePermission, permissionGate } = loadPermissionGate(detectDestructive)

  const v1Input = {
    id: "perm-1",
    type: "bash",
    pattern: "git reset --hard HEAD",
    metadata: {},
  }
  const v2Input = {
    id: "perm-2",
    permission: "bash",
    patterns: ["python3 rag/scripts/add_memory.py --title x --content y --no-sync"],
    metadata: {},
  }
  const metadataInput = {
    id: "perm-3",
    type: "bash",
    metadata: { command: "find . -name '*.tmp' -delete" },
  }

  assert.equal(findDestructivePermission(v1Input)?.hit.name, "git-reset-hard")
  assert.equal(findDestructivePermission(v2Input)?.hit.name, "rag-add-memory")
  assert.equal(findDestructivePermission(metadataInput)?.hit.name, "find-delete")

  const output = { status: "allow" }
  await permissionGate(null, v2Input, output)
  assert.equal(output.status, "ask")
})

test("permissionGate ignores non-bash permission patterns", () => {
  const { detectDestructive } = loadPatterns()
  const { findDestructivePermission } = loadPermissionGate(detectDestructive)

  assert.equal(findDestructivePermission({
    permission: "read",
    patterns: ["rag/scripts/load_docs.py"],
    metadata: {},
  }), null)
})

test("notify hook detects successful git push tool output", () => {
  const notifyHook = loadNotifyHook()

  assert.equal(notifyHook.isGitPushCommand({ args: { command: "git push origin master" } }), true)
  assert.equal(notifyHook.isGitPushCommand({ args: { command: "git status --short" } }), false)
  assert.equal(notifyHook.isGitPushSuccessOutput("To github.com:owner/repo.git\n   e99edce..b6b081f  master -> master"), true)
  assert.equal(notifyHook.isGitPushSuccessOutput("fatal: failed to push some refs"), false)
})

test("notify hook sends completion for any final text", async () => {
  const notifyHook = loadNotifyHook()

  await notifyHook.notifyOnTextComplete(null, { sessionID: "s1", messageID: "m1", partID: "p1" }, { text: "짧은 답변입니다." })

  assert.equal(notifyHook.notifications.length, 1)
  assert.equal(notifyHook.notifications[0][0], "completed")
  assert.equal(notifyHook.notifications[0][1], "짧은 답변입니다.")
  assert.equal(notifyHook.notifications[0][2].title, "hook:s1 완료")
  assert.equal(notifyHook.notifications[0][2].subtitle, "작업 결과")
})
