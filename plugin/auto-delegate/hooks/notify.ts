// @ts-nocheck
import { logger } from "../lib/logger.ts"
import { compact, notify } from "../lib/notify.ts"

const FAILURE_MARKERS = ["error", "Error", "failed", "Failed", "exception", "Exception"]
const CHOICE_MARKERS = ["[interview]", "선택", "결정", "답해주시면", "확인해야", "불확실", "질문"]
const BLOCKED_MARKERS = ["blocked", "Blocked", "블로커", "차단", "진행 불가"]
const REVIEW_MARKERS = ["리뷰 필요", "finding", "Findings", "이슈", "risk", "Risk"]
const COMPLETION_MARKERS = ["완료했습니다", "완료됐습니다", "완료되었습니다", "push 완료", "푸시 완료", "커밋하고 push 완료", "작업 완료"]

const recent = new Map()

function once(key, ttlMs = 8_000) {
  const now = Date.now()
  const last = recent.get(key) || 0
  if (now - last < ttlMs) return false
  recent.set(key, now)
  return true
}

function outputText(output) {
  const candidates = [output?.output, output?.text, output?.message]
  if (Array.isArray(output?.parts)) {
    candidates.push(output.parts.map((part) => part?.text || "").join("\n"))
  }
  return candidates.find((value) => typeof value === "string" && value.trim()) || ""
}

function containsAny(text, markers) {
  return markers.some((marker) => text.includes(marker))
}

function excerpt(text, markers) {
  const normalized = String(text ?? "").replace(/\r/g, "").trim()
  if (!normalized) return ""

  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean)
  const hit = lines.find((line) => markers.some((marker) => line.includes(marker)))
  const start = hit ? lines.indexOf(hit) : 0
  const selected = lines.slice(Math.max(start, 0), Math.max(start, 0) + 4).join(" · ") || lines[0] || normalized
  return selected.replace(/\s+/g, " ").slice(0, 520)
}

function subtitleFor(input, label) {
  const tool = input?.tool || "tool"
  const sessionID = input?.sessionID ? ` · ${String(input.sessionID).slice(0, 8)}` : ""
  return `${label} · ${tool}${sessionID}`
}

function commandSummary(input) {
  return input?.command || input?.args?.command || input?.metadata?.command || input?.pattern || "명령 실행 승인이 필요합니다"
}

function chatRole(input, output) {
  return input?.role || output?.role || input?.message?.role || output?.message?.role || ""
}

function completionSubtitle(text, input) {
  const sessionID = input?.sessionID ? ` · ${String(input.sessionID).slice(0, 8)}` : ""
  if (text.includes("커밋") || text.includes("push") || text.includes("푸시")) return `커밋/푸시${sessionID}`
  return `작업 결과${sessionID}`
}

export async function notifyOnEvent(_ctx, input) {
  try {
    const event = input?.event
    if (!event?.type) return

    const sessionID = event?.properties?.sessionID || event?.properties?.info?.sessionID || "unknown"

    if (event.type === "session.idle" && once(`idle:${sessionID}`, 30_000)) {
      await notify("completed", "작업이 완료됐습니다. 결과를 확인해주세요.", {
        subtitle: `작업 완료 · ${String(sessionID).slice(0, 8)}`,
        detail: `session.idle\nsessionID=${sessionID}`,
      })
    }
  } catch (err) {
    await logger.warn("notify.event", err)
  }
}

export async function notifyOnToolAfter(_ctx, input, output) {
  try {
    const text = outputText(output)
    if (!text) return

    const tool = input?.tool || "tool"
    const callID = input?.callID || input?.id || "unknown"

    if (containsAny(text, CHOICE_MARKERS) && once(`choice:${callID}`)) {
      await notify("choice_required", compact(excerpt(text, CHOICE_MARKERS)), {
        subtitle: subtitleFor(input, "사용자 결정 필요"),
        detail: text,
      })
      return
    }

    if (containsAny(text, BLOCKED_MARKERS) && once(`blocked:${callID}`)) {
      await notify("blocked", compact(excerpt(text, BLOCKED_MARKERS)), {
        subtitle: subtitleFor(input, "진행 차단"),
        detail: text,
      })
      return
    }

    if (containsAny(text, FAILURE_MARKERS) && once(`failed:${callID}`)) {
      await notify("failed", compact(excerpt(text, FAILURE_MARKERS)), {
        subtitle: subtitleFor(input, "실패/오류"),
        detail: text,
      })
      return
    }

    if (containsAny(text, REVIEW_MARKERS) && once(`review:${callID}`)) {
      await notify("review_required", compact(excerpt(text, REVIEW_MARKERS)), {
        subtitle: subtitleFor(input, "리뷰 확인"),
        detail: text,
      })
    }
  } catch (err) {
    await logger.warn("notify.tool-after", err)
  }
}

export async function notifyOnChatMessage(_ctx, input, output) {
  try {
    const role = chatRole(input, output)
    if (role && role !== "assistant") return

    const text = outputText(output)
    if (!text || text.includes("Task 호출 템플릿:")) return

    const sessionID = input?.sessionID || "unknown"
    if (containsAny(text, COMPLETION_MARKERS) && once(`chat-completed:${sessionID}`, 30_000)) {
      await notify("completed", compact(excerpt(text, COMPLETION_MARKERS)), {
        subtitle: completionSubtitle(text, input),
        detail: text,
      })
    }
  } catch (err) {
    await logger.warn("notify.chat-message", err)
  }
}

export async function notifyOnPermissionAsk(_ctx, input, output) {
  try {
    if (output?.status !== "ask") return
    const key = input?.id || input?.callID || JSON.stringify(input || {}).slice(0, 80)
    if (!once(`permission:${key}`, 30_000)) return

    await notify("approval_required", compact(commandSummary(input)), {
      subtitle: "명령 실행 승인 필요",
      detail: JSON.stringify(input || {}, null, 2),
    })
  } catch (err) {
    await logger.warn("notify.permission", err)
  }
}
