// @ts-nocheck
import { logger } from "../lib/logger.ts"

export async function eventTap(_ctx, input) {
  try {
    const e = input?.event
    if (!e?.type) return
    if (typeof e.type === "string" && e.type.startsWith("session.")) {
      await logger.info("event", { type: e.type, properties: e.properties })
    }
  } catch (err) {
    await logger.warn("event-tap", err)
  }
}
