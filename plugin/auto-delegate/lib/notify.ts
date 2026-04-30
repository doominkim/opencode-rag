// @ts-nocheck
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import notifier from "node-notifier"
import { logger } from "./logger.ts"

const ENABLED = process.env.OPENCODE_NOTIFY !== "0"
const DEFAULT_SOUND = "Glass"
const ICON_PATH = join(dirname(fileURLToPath(import.meta.url)), "../assets/opencode.png")
const DETAIL_PATH = "/Users/dominic/.config/opencode/logs/latest-notification.md"
const TITLE_MAX = 27
const SUBTITLE_MAX = 29
const MESSAGE_MAX = 85
const NODE_NOTIFIER_TIMEOUT_MS = 2_000

const KIND_CONFIG = {
  completed: { title: "완료", sound: "Glass" },
  input_required: { title: "입력 대기", sound: "Glass" },
  failed: { title: "실패", sound: "Basso" },
  choice_required: { title: "선택 필요", sound: "Glass" },
  approval_required: { title: "승인 필요", sound: "Basso" },
  blocked: { title: "진행 차단", sound: "Basso" },
  review_required: { title: "리뷰 필요", sound: "Glass" },
}

function cleanNotificationText(value, max = MESSAGE_MAX) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}

function markdownEscape(value) {
  return String(value ?? "").replace(/```/g, "`\u200b``")
}

async function writeNotificationDetail({ kind, title, subtitle, message, detail }) {
  const content = [
    `# ${title}`,
    "",
    `- kind: ${kind}`,
    `- time: ${new Date().toISOString()}`,
    subtitle ? `- subtitle: ${subtitle}` : null,
    "",
    "## Summary",
    "",
    markdownEscape(message),
    "",
    "## Detail",
    "",
    "```text",
    markdownEscape(detail || message),
    "```",
    "",
  ].filter((line) => line !== null).join("\n")

  await mkdir(dirname(DETAIL_PATH), { recursive: true })
  await writeFile(DETAIL_PATH, content, "utf8")
  return `file://${DETAIL_PATH}`
}

async function notifyWithNodeNotifier({ title, subtitle, message, sound, open }) {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`node-notifier timed out after ${NODE_NOTIFIER_TIMEOUT_MS}ms`))
    }, NODE_NOTIFIER_TIMEOUT_MS)

    notifier.notify(
      {
        title,
        subtitle,
        message,
        sound,
        icon: ICON_PATH,
        open,
        wait: false,
        timeout: 5,
      },
      (err) => {
        clearTimeout(timer)
        err ? reject(err) : resolve(undefined)
      },
    )
  })
}

export async function notify(kind, message, options = {}) {
  if (!ENABLED) return
  if (process.platform !== "darwin") return

  const config = KIND_CONFIG[kind] || { title: "OpenCode", sound: DEFAULT_SOUND }
  const title = cleanNotificationText(options.title || config.title, TITLE_MAX)
  const subtitle = cleanNotificationText(options.subtitle || "", SUBTITLE_MAX)
  const body = cleanNotificationText(message)
  const sound = cleanNotificationText(options.sound || config.sound || DEFAULT_SOUND)

  if (!body) return

  let open
  try {
    open = await writeNotificationDetail({
      kind,
      title,
      subtitle,
      message: body,
      detail: options.detail || message,
    })
  } catch (err) {
    await logger.warn("notify.detail.failed", err)
  }

  try {
    await notifyWithNodeNotifier({ title, subtitle, message: body, sound, open })
    await logger.info("notify.sent", { kind, title, subtitle, message: body, open, transport: "node-notifier" })
  } catch (err) {
    await logger.warn("notify.failed", err)
  }
}

export function compact(value, defaultValue = "상태 확인") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim()
  return text ? text.slice(0, MESSAGE_MAX) : defaultValue
}
