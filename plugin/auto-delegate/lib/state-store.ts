// @ts-nocheck
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises"
import { join } from "node:path"

const STATE_DIR = "/Users/dominic/.config/opencode/.theseus"
const LATEST = join(STATE_DIR, "latest.json")
const MAX_TOOL_CALLS = 50          // 너무 많이 누적되지 않게
const MAX_ARG_PREVIEW = 200        // tool args를 통째 저장하지 않고 preview만
const MAX_INTENT_PREVIEW = 400

// 영속화 대상 agent. theseus(orchestrator)와 metis(plan executor)만.
export const TARGET_AGENTS = new Set(["theseus", "metis"])

// 메모리 캐시 — plugin 인스턴스 수명 동안 유지.
const sessionAgent = new Map() // sessionID -> agent name
const sessionState = new Map() // sessionID -> { started, lastActivity, toolCalls, intent, ... }

export function setAgent(sessionID, agent) {
  if (!sessionID || !agent) return
  sessionAgent.set(sessionID, agent)
  if (!sessionState.has(sessionID) && TARGET_AGENTS.has(agent)) {
    sessionState.set(sessionID, {
      sessionID,
      agent,
      started: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      toolCalls: [],
      intent: null,
      lastUserText: null,
    })
  }
}

export function getAgent(sessionID) {
  return sessionAgent.get(sessionID) || null
}

export function isTracked(sessionID) {
  const agent = sessionAgent.get(sessionID)
  return !!(agent && TARGET_AGENTS.has(agent))
}

export function noteUserText(sessionID, text) {
  if (!isTracked(sessionID)) return
  const s = sessionState.get(sessionID)
  if (!s) return
  s.lastUserText = (text || "").slice(0, 600)
  s.lastActivity = new Date().toISOString()
  // 첫 user message에 [intent]나 의도 표현이 들어 있으면 캡처
  const intentMatch = /\[intent\][^\n]*/i.exec(text || "")
  if (intentMatch) {
    s.intent = intentMatch[0].slice(0, MAX_INTENT_PREVIEW)
  }
}

export function pushTool(sessionID, { tool, args, ts }) {
  if (!isTracked(sessionID)) return
  const s = sessionState.get(sessionID)
  if (!s) return
  const argPreview = previewArgs(args)
  s.toolCalls.push({ tool, args: argPreview, ts: ts || new Date().toISOString() })
  if (s.toolCalls.length > MAX_TOOL_CALLS) {
    s.toolCalls = s.toolCalls.slice(-MAX_TOOL_CALLS)
  }
  s.lastActivity = new Date().toISOString()
}

function previewArgs(args) {
  try {
    if (args == null) return null
    if (typeof args === "string") return args.slice(0, MAX_ARG_PREVIEW)
    const json = JSON.stringify(args)
    return json.length > MAX_ARG_PREVIEW ? json.slice(0, MAX_ARG_PREVIEW) + "…" : json
  } catch {
    return "<unserializable>"
  }
}

export async function dump(sessionID) {
  if (!isTracked(sessionID)) return null
  const s = sessionState.get(sessionID)
  if (!s) return null
  await mkdir(STATE_DIR, { recursive: true })
  const path = join(STATE_DIR, `${sessionID}.json`)
  await writeFile(path, JSON.stringify(s, null, 2), "utf8")
  await writeFile(LATEST, JSON.stringify({ sessionID: s.sessionID, agent: s.agent, ts: s.lastActivity }, null, 2), "utf8")
  return path
}

export async function readLatest() {
  try {
    const ptr = JSON.parse(await readFile(LATEST, "utf8"))
    if (!ptr?.sessionID) return null
    const path = join(STATE_DIR, `${ptr.sessionID}.json`)
    const state = JSON.parse(await readFile(path, "utf8"))
    return { ptr, state, path }
  } catch {
    return null
  }
}

export async function listStates() {
  try {
    const files = await readdir(STATE_DIR)
    return files.filter((f) => f.endsWith(".json") && f !== "latest.json")
  } catch {
    return []
  }
}
