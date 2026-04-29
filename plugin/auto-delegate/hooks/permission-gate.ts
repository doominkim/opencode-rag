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
// 입력 모양은 SDK Permission 타입 — bash 도구 권한 요청은 input.tool === "bash" 가정.

export async function permissionGate(_ctx, input, output) {
  try {
    if (!input || !output) return

    const tool = input.tool || input.type
    const cmd = typeof input?.command === "string"
      ? input.command
      : typeof input?.args?.command === "string"
        ? input.args.command
        : ""

    if (tool !== "bash" || !cmd) return

    const hit = detectDestructive(cmd)
    if (!hit) return

    // 이미 deny면 그대로 둔다. allow나 ask면 ask로 강제.
    if (output.status === "deny") return
    output.status = "ask"

    await logger.warn("permission-gate.force-ask", {
      sessionID: input.sessionID,
      callID: input.callID,
      pattern: hit.name,
      reason: hit.reason,
      command: cmd.slice(0, 300),
    })
  } catch (err) {
    await logger.warn("permission-gate", err)
  }
}
