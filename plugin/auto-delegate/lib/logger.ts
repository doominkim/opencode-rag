// @ts-nocheck
import { appendFile, mkdir } from "node:fs/promises"
import { dirname } from "node:path"

const LOG_PATH = "/Users/dominic/.config/opencode/logs/auto-delegate.jsonl"

async function append(level, scope, payload) {
  try {
    await mkdir(dirname(LOG_PATH), { recursive: true })
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      scope,
      payload: serialize(payload),
    }) + "\n"
    await appendFile(LOG_PATH, line, "utf8")
  } catch {
    // logger 실패는 plugin 동작을 막으면 안 된다 — silent drop
  }
}

function serialize(v) {
  if (v instanceof Error) return { name: v.name, message: v.message, stack: v.stack }
  return v
}

export const logger = {
  info: (scope, payload) => append("info", scope, payload),
  warn: (scope, payload) => append("warn", scope, payload),
  error: (scope, payload) => append("error", scope, payload),
}
