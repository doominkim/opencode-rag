// @ts-nocheck
import { logger } from "../lib/logger.ts"
import { compact, notify } from "../lib/notify.ts"

const LOGGED_EVENT_TYPES = new Set(["session.updated", "session.error"])
const IDLE_NOTIFY_DELAY_MS = Number(process.env.OPENCODE_IDLE_NOTIFY_DELAY_MS || 1_200)

const recent = new Map()
const sessionTitles = new Map()
const sessionStatuses = new Map()
const idleNotifyTimers = new Map()

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

function excerpt(text, markers) {
  const normalized = String(text ?? "").replace(/\r/g, "").trim()
  if (!normalized) return ""

  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean)
  const hit = lines.find((line) => markers.some((marker) => line.includes(marker)))
  const start = hit ? lines.indexOf(hit) : 0
  const selected = lines.slice(Math.max(start, 0), Math.max(start, 0) + 4).join(" · ") || lines[0] || normalized
  return selected.replace(/\s+/g, " ").slice(0, 520)
}

function titleFor(input, label) {
  const sessionID = getSessionID(input)
  const title = sessionID ? sessionTitles.get(sessionID) : ""
  if (title) return title
  const session = sessionID ? `:${String(sessionID).slice(0, 8)}` : ""
  return session ? `${String(sessionID).slice(0, 8)} ${label}` : label
}

function commandSummary(input) {
  return input?.command || input?.args?.command || input?.metadata?.command || input?.pattern || "명령 승인 필요"
}

function clearIdleNotify(sessionID) {
  const timer = idleNotifyTimers.get(sessionID)
  if (!timer) return
  clearTimeout(timer)
  idleNotifyTimers.delete(sessionID)
}

function scheduleIdleNotify(input, sessionID) {
  clearIdleNotify(sessionID)
  idleNotifyTimers.set(sessionID, setTimeout(async () => {
    idleNotifyTimers.delete(sessionID)
    if (sessionStatuses.get(sessionID) !== "idle") return

    try {
      await notify("input_required", "입력할 차례", {
        title: titleFor(input, "입력 대기"),
        subtitle: "사용자 입력",
        detail: `session.status idle\nsessionID=${sessionID}`,
      })
    } catch (err) {
      await logger.warn("notify.idle", err)
    }
  }, IDLE_NOTIFY_DELAY_MS))
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

    if (event.type === "session.status") {
      const sessionID = getSessionID(input)
      const status = event?.properties?.status?.type
      if (!sessionID || !status) return

      const previous = sessionStatuses.get(sessionID)
      sessionStatuses.set(sessionID, status)

      if (status === "busy") {
        clearIdleNotify(sessionID)
        return
      }

      if (status === "idle" && previous === "busy") {
        scheduleIdleNotify(input, sessionID)
      }
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
    // Tool output is often an intermediate state. Do not notify from it;
    // notify only when the runtime explicitly asks for user approval.
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
    // Final text completes on every assistant response; do not notify here.
    // User-visible notifications are limited to explicit approval requests.
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
