// @ts-nocheck
import { route } from "../lib/router.ts"
import { logger } from "../lib/logger.ts"
import { readLatest, noteUserText, isTracked, TARGET_AGENTS } from "../lib/state-store.ts"

// 새 세션의 첫 user message에서만 latest state를 inject. 이후엔 중복 주입 안 함.
const seenSessions = new Set()

// OpenCode plugin hook은 agent 자체를 바꿀 수 없다 (chat.message output은 parts만 노출).
// 따라서 이 hook은 "강한 위임 권고 텍스트 + Task 호출 템플릿"을 user message parts에 주입한다.
// 모델이 수용해야 실제 위임이 일어나므로 아래 결정은 confidence 기반으로 어조를 조절한다.
export async function userPrompt(_ctx, input, output) {
  try {
    const parts = output?.parts
    if (!Array.isArray(parts)) return
    const text = parts
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join("\n")
      .trim()
    if (!text) return

    const sessionID = input?.sessionID
    const agent = input?.agent

    // user text를 state에 기록 (theseus/metis 세션이면)
    noteUserText(sessionID, text)

    // 새 세션의 첫 메시지면 latest state를 reminder로 inject
    if (sessionID && !seenSessions.has(sessionID)) {
      seenSessions.add(sessionID)
      await maybeInjectResume(parts, sessionID, agent)
    }

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

// theseus/metis 세션의 마지막 state를 새 세션 첫 prompt에 reminder로 주입.
// 일반 세션은 latest가 같은 agent일 때만(=이어서 작업하는 맥락일 때만) 주입.
async function maybeInjectResume(parts, sessionID, currentAgent) {
  try {
    const latest = await readLatest()
    if (!latest?.state) return
    if (latest.state.sessionID === sessionID) return // 같은 세션이면 skip

    const sameAgent = currentAgent && latest.state.agent === currentAgent
    const tracked = currentAgent && TARGET_AGENTS.has(currentAgent)
    if (!tracked && !sameAgent) return // theseus/metis가 아닌 일반 세션엔 노이즈 안 됨

    const lines = [
      `[auto-delegate resume] 이전 ${latest.state.agent} 세션의 마지막 상태입니다 (.theseus/${latest.state.sessionID}.json).`,
      `- 마지막 활동: ${latest.state.lastActivity}`,
    ]
    if (latest.state.intent) {
      lines.push(`- 마지막 의도: ${latest.state.intent}`)
    }
    if (latest.state.lastUserText) {
      lines.push(`- 마지막 user prompt: ${latest.state.lastUserText.slice(0, 200)}`)
    }
    const recentTools = (latest.state.toolCalls || []).slice(-5)
    if (recentTools.length > 0) {
      lines.push(`- 최근 tool 호출 ${recentTools.length}건:`)
      for (const t of recentTools) {
        lines.push(`  - ${t.tool}: ${t.args || ""}`)
      }
    }
    lines.push("이어서 작업하려면 위 컨텍스트를 활용하세요. 새 작업이면 무시해도 됩니다.")
    parts.push({ type: "text", text: lines.join("\n") })

    await logger.info("user-prompt.resume-injected", {
      sessionID,
      currentAgent,
      latestAgent: latest.state.agent,
      latestSession: latest.state.sessionID,
    })
  } catch (err) {
    await logger.warn("user-prompt.resume", err)
  }
}
