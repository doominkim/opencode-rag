// @ts-nocheck
import { detectDestructive } from "../lib/patterns.ts"
import { logger } from "../lib/logger.ts"

export async function toolPre(_ctx, input, output) {
  try {
    if (input?.tool !== "bash") return
    const cmd = typeof output?.args?.command === "string" ? output.args.command : ""
    if (!cmd) return
    const hit = detectDestructive(cmd)
    if (hit) {
      await logger.warn("tool-pre.destructive-detected", {
        tool: input.tool,
        sessionID: input.sessionID,
        callID: input.callID,
        pattern: hit.name,
        reason: hit.reason,
        command: cmd.slice(0, 300),
      })
    }
  } catch (err) {
    await logger.warn("tool-pre", err)
  }
}
