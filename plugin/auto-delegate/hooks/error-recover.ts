// @ts-nocheck
import { logger } from "../lib/logger.ts"

const FAILURE_MARKERS = ["error", "Error", "failed", "Failed", "exception", "Exception"]

export async function errorRecover(_ctx, input, output) {
  try {
    if (input?.tool !== "task") return
    const out = output?.output
    if (typeof out !== "string") return
    const failed = FAILURE_MARKERS.some((m) => out.includes(m))
    if (!failed) return

    await logger.warn("error-recover.subagent-failed", {
      tool: input.tool,
      callID: input.callID,
      excerpt: out.slice(0, 300),
    })

    output.metadata = output.metadata || {}
    output.metadata.autoDelegateReminder =
      "subagent 호출이 실패한 것으로 보입니다. 재시도 루프 만들지 말고 직접 처리하거나 사용자에게 보고하세요 (AGENTS.md 정책)."
  } catch (err) {
    await logger.warn("error-recover", err)
  }
}
