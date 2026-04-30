import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("plugin does not register noisy text complete notifications", () => {
  const source = readFileSync("plugin/auto-delegate/index.ts", "utf8")
  assert.equal(source.includes('"experimental.text.complete"'), false)
  assert.equal(source.includes("notifyOnTextComplete"), false)
})

test("permission policy is the documented source of truth", () => {
  const agents = readFileSync("AGENTS.md", "utf8")
  const permissions = readFileSync("PERMISSIONS.md", "utf8")
  const rules = readFileSync("plugin/auto-delegate/lib/permissions.ts", "utf8")

  assert.equal(agents.includes("PERMISSIONS.md"), true)
  assert.equal(agents.includes("PERMISSION_RULES"), true)
  assert.equal(permissions.includes("/Users/dominic/.config/opencode/plugin/auto-delegate/lib/permissions.ts"), true)
  assert.equal(permissions.includes("must not duplicate the full rule table"), true)
  assert.equal(rules.includes("export const PERMISSION_RULES"), true)
  assert.equal(rules.includes('id: "git-mv"'), true)
  assert.equal(rules.includes('action: "ask"'), true)
  assert.equal(rules.includes("requiresUserApproval"), false)
  assert.equal(rules.includes("approvalLevel"), false)
  assert.equal(rules.includes("enforcement"), false)
  assert.equal(rules.includes("allow: true"), false)
  assert.equal(rules.includes("allow: false"), false)
})

test("router does not include general-purpose agent", () => {
  const agents = loadAgents()
  assert.equal(agents.some((agent) => agent.name === "general-purpose"), false)
})

test("notify lib uses hook notification path only", () => {
  const source = readFileSync("plugin/auto-delegate/lib/notify.ts", "utf8")
  assert.equal(source.includes("TERMINAL_NOTIFIER_PATH"), false)
  assert.equal(source.includes("transport: \"terminal-notifier\""), false)
})

function loadPatterns() {
  const permissionsSource = readFileSync("plugin/auto-delegate/lib/permissions.ts", "utf8")
    .replace(/^\/\/ @ts-nocheck\n+/, "")
    .replace("export const PERMISSION_RULES =", "const PERMISSION_RULES =")

  const { PERMISSION_RULES } = Function(`${permissionsSource}\nreturn { PERMISSION_RULES }`)()

  const source = readFileSync("plugin/auto-delegate/lib/patterns.ts", "utf8")
    .replace(/^\/\/ @ts-nocheck\n+/, "")
    .replace('import { PERMISSION_RULES } from "./permissions.ts"\n', "")
    .replace("export const DESTRUCTIVE_PATTERNS =", "const DESTRUCTIVE_PATTERNS =")
    .replace("export function detectDestructive", "function detectDestructive")

  return Function("PERMISSION_RULES", `${source}\nreturn { DESTRUCTIVE_PATTERNS, detectDestructive }`)(PERMISSION_RULES)
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
    .replace('import { compact, notify } from "../lib/notify.ts"\n', "const notifications = []\nconst compact = (value, defaultValue = '상태 확인') => String(value ?? '').replace(/\\s+/g, ' ').trim() || defaultValue\nconst notify = async (...args) => { notifications.push(args) }\n")
    .replaceAll("export async function", "async function")

  return Function(`${source}\nreturn { notifyOnEvent, notifyOnToolAfter, notifyOnTextComplete, notifyOnPermissionAsk, notifications }`)()
}

test("detectDestructive catches high-risk commands", () => {
  const { detectDestructive } = loadPatterns()
  const cases = [
    ["rm -rf /tmp/opencode-test", "rm-rf"],
    ["git push --force origin master", "git-push-force"],
    ["git push origin master", "git-push"],
    ["git pull --rebase", "git-pull"],
    ["git fetch origin", "git-fetch"],
    ["git add AGENTS.md", "git-add"],
    ["git mv old.ts new.ts", "git-mv"],
    ["git rm old.ts", "git-rm"],
    ["git commit -m test", "git-commit"],
    ["git worktree remove --force ../tmp", "git-worktree-mutate"],
    ["git reset --hard HEAD", "git-reset-hard"],
    ["git reset HEAD~1", "git-reset"],
    ["git branch -d feature/test", "git-branch-delete"],
    ["git checkout -f main", "git-checkout-force"],
    ["git checkout main", "git-checkout"],
    ["git switch --force main", "git-switch-force"],
    ["git switch main", "git-switch"],
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

test("notify hook uses renamed session title when available", async () => {
  const notifyHook = loadNotifyHook()

  await notifyHook.notifyOnEvent(null, {
    event: {
      type: "session.updated",
      properties: {
        info: {
          id: "session-123456789",
          title: "node notifier 5회 호출 테스트",
        },
      },
    },
  })
  await notifyHook.notifyOnPermissionAsk(null, { sessionID: "session-123456789", id: "perm-1", pattern: "git reset --hard HEAD" }, { status: "ask" })

  assert.equal(notifyHook.notifications.length, 1)
  assert.equal(notifyHook.notifications[0][2].title, "node notifier 5회 호출 테스트")
})

test("notify hook does not alert on idle or ordinary tool failures", async () => {
  const notifyHook = loadNotifyHook()

  await notifyHook.notifyOnEvent(null, {
    sessionID: "session-123456789",
    event: { type: "session.idle", properties: { sessionID: "session-123456789" } },
  })
  await notifyHook.notifyOnToolAfter(null, { tool: "bash", callID: "call-1", args: { command: "npm test" } }, { output: "Error: expected failure while debugging" })

  assert.equal(notifyHook.notifications.length, 0)
})

test("notify hook alerts when session status stays idle", async () => {
  const previousDelay = process.env.OPENCODE_IDLE_NOTIFY_DELAY_MS
  process.env.OPENCODE_IDLE_NOTIFY_DELAY_MS = "1"
  const notifyHook = loadNotifyHook()

  await notifyHook.notifyOnEvent(null, {
    sessionID: "session-123456789",
    event: { type: "session.status", properties: { sessionID: "session-123456789", status: { type: "busy" } } },
  })
  await notifyHook.notifyOnEvent(null, {
    sessionID: "session-123456789",
    event: { type: "session.status", properties: { sessionID: "session-123456789", status: { type: "idle" } } },
  })
  await new Promise((resolve) => setTimeout(resolve, 10))

  if (previousDelay === undefined) delete process.env.OPENCODE_IDLE_NOTIFY_DELAY_MS
  else process.env.OPENCODE_IDLE_NOTIFY_DELAY_MS = previousDelay

  assert.equal(notifyHook.notifications.length, 1)
  assert.equal(notifyHook.notifications[0][0], "input_required")
  assert.equal(notifyHook.notifications[0][1], "입력할 차례")
  assert.equal(notifyHook.notifications[0][2].subtitle, "사용자 입력")
})

test("notify hook cancels idle alert when session becomes busy again", async () => {
  const previousDelay = process.env.OPENCODE_IDLE_NOTIFY_DELAY_MS
  process.env.OPENCODE_IDLE_NOTIFY_DELAY_MS = "20"
  const notifyHook = loadNotifyHook()

  await notifyHook.notifyOnEvent(null, {
    sessionID: "session-123456789",
    event: { type: "session.status", properties: { sessionID: "session-123456789", status: { type: "busy" } } },
  })
  await notifyHook.notifyOnEvent(null, {
    sessionID: "session-123456789",
    event: { type: "session.status", properties: { sessionID: "session-123456789", status: { type: "idle" } } },
  })
  await notifyHook.notifyOnEvent(null, {
    sessionID: "session-123456789",
    event: { type: "session.status", properties: { sessionID: "session-123456789", status: { type: "busy" } } },
  })
  await new Promise((resolve) => setTimeout(resolve, 30))

  if (previousDelay === undefined) delete process.env.OPENCODE_IDLE_NOTIFY_DELAY_MS
  else process.env.OPENCODE_IDLE_NOTIFY_DELAY_MS = previousDelay

  assert.equal(notifyHook.notifications.length, 0)
})

test("notify hook does not alert from intermediate tool output", async () => {
  const notifyHook = loadNotifyHook()

  await notifyHook.notifyOnToolAfter(null, { tool: "bash", callID: "call-1", args: { command: "npm test" } }, { output: "선택이 필요합니다" })
  await notifyHook.notifyOnToolAfter(null, { tool: "bash", callID: "call-2", args: { command: "npm test" } }, { output: "blocked: 진행 불가" })
  await notifyHook.notifyOnToolAfter(null, { tool: "bash", callID: "call-3", args: { command: "git push origin master" } }, { output: "To github.com:owner/repo.git\n   e99edce..b6b081f  master -> master" })

  assert.equal(notifyHook.notifications.length, 0)
})

test("notify hook alerts only when permission asks for user approval", async () => {
  const notifyHook = loadNotifyHook()

  await notifyHook.notifyOnPermissionAsk(null, { id: "perm-1", pattern: "git reset --hard HEAD" }, { status: "ask" })

  assert.equal(notifyHook.notifications.length, 1)
  assert.equal(notifyHook.notifications[0][0], "approval_required")
  assert.equal(notifyHook.notifications[0][2].subtitle, "명령 승인")
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

test("notify hook does not alert on final text completion", async () => {
  const notifyHook = loadNotifyHook()

  await notifyHook.notifyOnTextComplete(null, { sessionID: "s1", messageID: "m1", partID: "p1" }, { text: "짧은 답변입니다." })

  assert.equal(notifyHook.notifications.length, 0)
})
