// @ts-nocheck
import { logger } from "../lib/logger.ts"
import { setAgent, pushTool, dump, isTracked, getAgent } from "../lib/state-store.ts"

// chat.message: 매 메시지마다 active agent를 등록. theseus/metis만 추적.
export async function trackAgent(_ctx, input, _output) {
  try {
    const sessionID = input?.sessionID
    const agent = input?.agent
    if (!sessionID || !agent) return
    setAgent(sessionID, agent)
  } catch (err) {
    await logger.warn("state-persist.track-agent", err)
  }
}

// tool.execute.after: theseus/metis 세션의 tool call을 누적
export async function trackTool(_ctx, input, _output) {
  try {
    const sessionID = input?.sessionID
    if (!isTracked(sessionID)) return
    pushTool(sessionID, { tool: input.tool, args: input.args, ts: new Date().toISOString() })
  } catch (err) {
    await logger.warn("state-persist.track-tool", err)
  }
}

// event: session.idle / session.compacted / session.status — 영속화 트리거
export async function persistOnEvent(_ctx, input) {
  try {
    const e = input?.event
    if (!e?.type) return
    const sessionID = e?.properties?.sessionID || e?.properties?.info?.sessionID
    if (!sessionID || !isTracked(sessionID)) return
    if (e.type === "session.idle" || e.type === "session.compacted") {
      const path = await dump(sessionID)
      if (path) {
        await logger.info("state-persist.dumped", {
          event: e.type,
          sessionID,
          agent: getAgent(sessionID),
          path,
        })
      }
    }
  } catch (err) {
    await logger.warn("state-persist.event", err)
  }
}
