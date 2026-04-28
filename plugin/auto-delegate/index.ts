// @ts-nocheck
import { logger } from "./lib/logger.ts"
import { eventTap } from "./hooks/event-tap.ts"
import { systemInject } from "./hooks/system-inject.ts"
import { toolPre } from "./hooks/tool-pre.ts"
import { userPrompt } from "./hooks/user-prompt.ts"
import { errorRecover } from "./hooks/error-recover.ts"
import { chatParams } from "./hooks/chat-params.ts"

export const AutoDelegate = async (ctx) => {
  try {
    await logger.info("plugin.init", { name: "auto-delegate", version: "0.2.0" })
    return {
      "event": (input) =>
        eventTap(ctx, input).catch((e) => logger.warn("hook.event", e)),
      "tool.execute.before": (input, output) =>
        toolPre(ctx, input, output).catch((e) => logger.warn("hook.tool-pre", e)),
      "tool.execute.after": (input, output) =>
        errorRecover(ctx, input, output).catch((e) => logger.warn("hook.tool-after", e)),
      "chat.message": (input, output) =>
        userPrompt(ctx, input, output).catch((e) => logger.warn("hook.chat-message", e)),
      "chat.params": (input, output) =>
        chatParams(ctx, input, output).catch((e) => logger.warn("hook.chat-params", e)),
      "experimental.chat.system.transform": (input, output) =>
        systemInject(ctx, input, output).catch((e) => logger.warn("hook.system-transform", e)),
    }
  } catch (e) {
    await logger.error("plugin.init", e)
    return {}
  }
}

export default AutoDelegate
