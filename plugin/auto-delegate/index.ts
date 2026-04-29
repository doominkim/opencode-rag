// @ts-nocheck
import { logger } from "./lib/logger.ts"
import { eventTap } from "./hooks/event-tap.ts"
import { systemInject } from "./hooks/system-inject.ts"
import { toolPre } from "./hooks/tool-pre.ts"
import { userPrompt } from "./hooks/user-prompt.ts"
import { errorRecover } from "./hooks/error-recover.ts"
import { chatParams } from "./hooks/chat-params.ts"
import { autoContinue } from "./hooks/auto-continue.ts"
import { sessionCompacting } from "./hooks/session-compact.ts"
import { permissionGate } from "./hooks/permission-gate.ts"
import { commandPre } from "./hooks/command-pre.ts"
import { toolDef } from "./hooks/tool-def.ts"
import { trackAgent, trackTool, persistOnEvent } from "./hooks/state-persist.ts"

export const AutoDelegate = async (ctx) => {
  try {
    await logger.info("plugin.init", { name: "auto-delegate", version: "0.5.0" })
    return {
      "event": (input) =>
        Promise.all([
          eventTap(ctx, input).catch((e) => logger.warn("hook.event", e)),
          persistOnEvent(ctx, input).catch((e) => logger.warn("hook.state-persist-event", e)),
        ]),
      "tool.execute.before": (input, output) =>
        toolPre(ctx, input, output).catch((e) => logger.warn("hook.tool-pre", e)),
      "tool.execute.after": (input, output) =>
        Promise.all([
          errorRecover(ctx, input, output).catch((e) => logger.warn("hook.tool-after", e)),
          trackTool(ctx, input, output).catch((e) => logger.warn("hook.state-persist-tool", e)),
        ]),
      "chat.message": (input, output) =>
        Promise.all([
          trackAgent(ctx, input, output).catch((e) => logger.warn("hook.state-persist-agent", e)),
          userPrompt(ctx, input, output).catch((e) => logger.warn("hook.chat-message", e)),
        ]),
      "chat.params": (input, output) =>
        chatParams(ctx, input, output).catch((e) => logger.warn("hook.chat-params", e)),
      "experimental.chat.system.transform": (input, output) =>
        systemInject(ctx, input, output).catch((e) => logger.warn("hook.system-transform", e)),
      "experimental.session.compacting": (input, output) =>
        sessionCompacting(ctx, input, output).catch((e) => logger.warn("hook.session-compact", e)),
      "experimental.compaction.autocontinue": (input, output) =>
        autoContinue(ctx, input, output).catch((e) => logger.warn("hook.auto-continue", e)),
      "permission.ask": (input, output) =>
        permissionGate(ctx, input, output).catch((e) => logger.warn("hook.permission-ask", e)),
      "command.execute.before": (input, output) =>
        commandPre(ctx, input, output).catch((e) => logger.warn("hook.command-pre", e)),
      "tool.definition": (input, output) =>
        toolDef(ctx, input, output).catch((e) => logger.warn("hook.tool-def", e)),
    }
  } catch (e) {
    await logger.error("plugin.init", e)
    return {}
  }
}

export default AutoDelegate
