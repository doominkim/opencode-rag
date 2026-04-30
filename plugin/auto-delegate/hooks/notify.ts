// @ts-nocheck
import { logger } from "../lib/logger.ts"
import { compact, notify } from "../lib/notify.ts"

const CHOICE_MARKERS = ["[interview]", "선택", "결정", "답해주시면", "확인해야", "불확실", "질문"]
const BLOCKED_MARKERS = ["blocked", "Blocked", "블로커", "차단", "진행 불가"]
const COMPLETION_MARKERS = ["완료했습니다", "완료됐습니다", "완료되었습니다", "push 완료", "푸시 완료", "커밋하고 push 완료", "작업 완료"]
const GIT_PUSH_SUCCESS_MARKERS = ["->", "Everything up-to-date"]
const LOGGED_EVENT_TYPES = new Set(["session.updated", "session.error"])

const recent = new Map()
const sessionTitles = new Map()

function getSessionID(input) {
  return input?.sessionID || input?.sessionId || input?.event?.properties?.sessionID || input?.event?.properties?.sessionId || input?.event?.properties?.info?.sessionID || input?.event?.properties?.info?.sessionId || input?.event?.properties?.info?.id
}

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
  return `${label} · ${tool}`
}

function titleFor(input, label) {
  const sessionID = getSessionID(input)
  const title = sessionID ? sessionTitles.get(sessionID) : ""
  if (title) return `hook: ${title}`
  const session = sessionID ? `:${String(sessionID).slice(0, 8)}` : ""
  return `hook${session} ${label}`
}

function commandSummary(input) {
  return input?.command || input?.args?.command || input?.metadata?.command || input?.pattern || "명령 승인 필요"
}

function isGitPushCommand(input) {
  const command = commandSummary(input)
  return /(^|\s)git\s+push(\s|$)/.test(command)
}

function isGitPushSuccessOutput(text) {
  return text.includes("To ") && containsAny(text, GIT_PUSH_SUCCESS_MARKERS)
}

function completionSubtitle(text, input) {
  if (text.includes("커밋") || text.includes("push") || text.includes("푸시")) return "커밋/푸시"
  return "작업 결과"
}

export async function notifyOnEvent(_ctx, input) {
  try {
    const event = input?.event
    if (!event?.type) return

    if (LOGGED_EVENT_TYPES.has(event.type)) {
      await logger.info("notify.event.enter", { type: event.type, sessionID: getSessionID(input) })
    }

    const sessionID = getSessionID(input) || "unknown"
    const sessionTitle = event?.properties?.info?.title
    if (event.type === "session.updated" && event?.properties?.info?.id && typeof sessionTitle === "string" && sessionTitle.trim()) {
      sessionTitles.set(event.properties.info.id, sessionTitle.trim())
    }

    // session.idle can fire while the assistant is still working between tool calls.
    // Do not notify here; final/user-action notifications come from narrower hooks.
  } catch (err) {
    await logger.warn("notify.event", err)
  }
}

export async function notifyOnToolAfter(_ctx, input, output) {
  try {
    const text = outputText(output)
    await logger.info("notify.tool-after.enter", {
      tool: input?.tool,
      sessionID: getSessionID(input),
      callID: input?.callID || input?.id,
      args: input?.args,
      outputKeys: Object.keys(output || {}),
      outputPreview: String(text || "").slice(0, 240),
    })
    if (!text) return

    const tool = input?.tool || "tool"
    const callID = input?.callID || input?.id || "unknown"

    if (containsAny(text, CHOICE_MARKERS) && once(`choice:${callID}`)) {
      await notify("choice_required", compact(excerpt(text, CHOICE_MARKERS)), {
        title: titleFor(input, "선택 필요"),
        subtitle: subtitleFor(input, "사용자 결정 필요"),
        detail: text,
      })
      return
    }

    if (containsAny(text, BLOCKED_MARKERS) && once(`blocked:${callID}`)) {
      await notify("blocked", compact(excerpt(text, BLOCKED_MARKERS)), {
        title: titleFor(input, "진행 차단"),
        subtitle: subtitleFor(input, "진행 차단"),
        detail: text,
      })
      return
    }

    if (isGitPushCommand(input) && isGitPushSuccessOutput(text) && once(`git-push:${callID}`)) {
      await notify("completed", compact(excerpt(text, GIT_PUSH_SUCCESS_MARKERS), "git push 완료"), {
        title: titleFor(input, "완료"),
        subtitle: subtitleFor(input, "커밋/푸시 완료"),
        detail: text,
      })
      return
    }
  } catch (err) {
    await logger.warn("notify.tool-after", err)
  }
}

export async function notifyOnTextComplete(_ctx, input, output) {
  try {
    const text = output?.text || outputText(output)
    await logger.info("notify.text-complete.enter", {
      sessionID: getSessionID(input),
      messageID: input?.messageID,
      partID: input?.partID,
      textPreview: String(text || "").slice(0, 240),
    })
    if (!text || text.includes("Task 호출 템플릿:")) return

    const sessionID = getSessionID(input) || "unknown"
    if (once(`text-completed:${sessionID}:${input?.messageID || "unknown"}`, 30_000)) {
      await notify("completed", compact(excerpt(text, COMPLETION_MARKERS), "응답 완료"), {
        title: titleFor(input, "완료"),
        subtitle: completionSubtitle(text, input),
        detail: text,
      })
    }
  } catch (err) {
    await logger.warn("notify.text-complete", err)
  }
}

export async function notifyOnPermissionAsk(_ctx, input, output) {
  try {
    await logger.info("notify.permission.enter", { status: output?.status, inputKeys: Object.keys(input || {}) })
    if (output?.status !== "ask") return
    const key = input?.id || input?.callID || JSON.stringify(input || {}).slice(0, 80)
    if (!once(`permission:${key}`, 30_000)) return

    await notify("approval_required", compact(commandSummary(input)), {
      title: titleFor(input, "승인 필요"),
      subtitle: "명령 승인",
      detail: JSON.stringify(input || {}, null, 2),
    })
  } catch (err) {
    await logger.warn("notify.permission", err)
  }
}
