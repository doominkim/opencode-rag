// @ts-nocheck
import { route } from "../lib/router.ts"
import { logger } from "../lib/logger.ts"

// OpenCode plugin hook은 agent 자체를 바꿀 수 없다 (chat.message output은 parts만 노출).
// 따라서 이 hook은 "강한 위임 권고 텍스트 + Task 호출 템플릿"을 user message parts에 주입한다.
// 모델이 수용해야 실제 위임이 일어나므로 아래 결정은 confidence 기반으로 어조를 조절한다.
export async function userPrompt(_ctx, _input, output) {
  try {
    const parts = output?.parts
    if (!Array.isArray(parts)) return
    const text = parts
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join("\n")
      .trim()
    if (!text) return

    const decision = route(text)
    if (decision.confidence === "none") return

    const top = decision.agents[0]
    const others = decision.agents.slice(1)

    let header
    if (decision.confidence === "explicit") {
      header = `[auto-delegate] 명시적 위임 — ${top.agent}로 즉시 위임하세요.`
    } else if (decision.confidence === "high") {
      header = `[auto-delegate] 위임 권고(HIGH) — ${top.agent}로 위임하세요. 직접 처리하기 전에 Task tool 호출을 우선 검토.`
    } else {
      header = `[auto-delegate] 위임 후보(MEDIUM) — ${top.agent} 검토 권고. 단순 작업이면 직접 처리도 가능.`
    }

    const lines = [
      header,
      `- 매칭 사유: ${top.reason}`,
    ]
    if (others.length > 0) {
      lines.push(`- 보조 후보: ${others.map((h) => `${h.agent}(${h.reason})`).join(", ")}`)
    }
    lines.push("")
    lines.push("Task 호출 템플릿:")
    lines.push("```")
    lines.push(`Task(subagent_type="${top.agent}", prompt="<원본 prompt 또는 범위 좁힌 prompt>")`)
    lines.push("```")
    lines.push("사용자 override가 항상 우선합니다. 위임이 부적절하다고 판단되면 직접 처리하세요.")

    parts.push({ type: "text", text: lines.join("\n") })

    await logger.info("router.match", {
      confidence: decision.confidence,
      agents: decision.agents.map((h) => h.agent),
    })
  } catch (err) {
    await logger.warn("user-prompt", err)
  }
}
