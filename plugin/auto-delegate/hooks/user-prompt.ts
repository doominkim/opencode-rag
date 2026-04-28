// @ts-nocheck
import { matchAgent } from "../lib/router.ts"
import { logger } from "../lib/logger.ts"

export async function userPrompt(_ctx, _input, output) {
  try {
    const parts = output?.parts
    if (!Array.isArray(parts)) return
    const text = parts
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join("\n")
      .trim()
    if (!text) return

    const hits = matchAgent(text)
    if (hits.length === 0) return

    const reminder = [
      "[auto-delegate router] 패턴 매칭 — 위임 후보:",
      ...hits.map((h) => `- ${h.agent} (${h.category}): ${h.reason}`),
      "사용자 override가 항상 우선합니다. 직접 처리해도 됩니다.",
    ].join("\n")

    parts.push({ type: "text", text: reminder })
    await logger.info("router.match", { agents: hits.map((h) => h.agent) })
  } catch (err) {
    await logger.warn("user-prompt", err)
  }
}
