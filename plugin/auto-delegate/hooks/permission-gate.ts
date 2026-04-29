// @ts-nocheck
import { logger } from "../lib/logger.ts"
import { detectDestructive } from "../lib/patterns.ts"

// permission.ask: OpenCode가 사용자에게 권한을 물을지 결정하는 hook.
// status: "ask" | "deny" | "allow".
//
// 정책:
// - destructive bash 명령은 강제로 "ask" (자동 allow 금지). 이미 허용 중이어도 다시 묻는다.
//   tool-pre.ts는 log warning만 했으므로, 실제 게이트는 여기서 잡는다.
// - 그 외엔 OpenCode가 정한 status를 그대로 둔다.
//
// 입력 모양은 OpenCode/SDK 버전에 따라 다르다.
// v1: { type, pattern, metadata }, v2: { permission, patterns, metadata, tool }.
// command 문자열이 별도 필드로 오지 않는 경우 pattern(s)에 bash command가 들어온다.

export function permissionCommandCandidates(input) {
  const candidates = []
  const push = (value) => {
    if (typeof value === "string" && value.trim()) candidates.push(value)
    if (Array.isArray(value)) value.forEach(push)
  }

  push(input?.command)
  push(input?.args?.command)
  push(input?.pattern)
  push(input?.patterns)
  push(input?.metadata?.command)
  push(input?.metadata?.args?.command)
  push(input?.metadata?.pattern)
  push(input?.metadata?.patterns)

  return candidates
}

export function isBashPermission(input) {
  const kinds = [
    input?.tool,
    input?.type,
    input?.permission,
    input?.metadata?.tool,
    input?.metadata?.permission,
  ]
    .filter((value) => typeof value === "string")
    .map((value) => value.toLowerCase())

  if (kinds.some((value) => ["bash", "shell", "command"].includes(value))) return true

  // 일부 hook shape는 command를 직접 제공하고 permission kind를 생략할 수 있다.
  return Boolean(input?.command || input?.args?.command || input?.metadata?.command || input?.metadata?.args?.command)
}

export function findDestructivePermission(input) {
  if (!isBashPermission(input)) return null

  const candidates = permissionCommandCandidates(input)
  for (const command of candidates) {
    const hit = detectDestructive(command)
    if (hit) return { hit, command }
  }
  return null
}

export async function permissionGate(_ctx, input, output) {
  try {
    if (!input || !output) return

    const destructive = findDestructivePermission(input)
    if (!destructive) return

    // 이미 deny면 그대로 둔다. allow나 ask면 ask로 강제.
    if (output.status === "deny") return
    output.status = "ask"

    await logger.warn("permission-gate.force-ask", {
      sessionID: input.sessionID,
      callID: input.callID,
      permissionID: input.id,
      pattern: destructive.hit.name,
      reason: destructive.hit.reason,
      command: destructive.command.slice(0, 300),
    })
  } catch (err) {
    await logger.warn("permission-gate", err)
  }
}
