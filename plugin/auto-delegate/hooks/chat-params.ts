// @ts-nocheck
import { presetForAgent } from "../lib/presets.ts"
import { logger } from "../lib/logger.ts"

// chat.params는 agent가 결정된 뒤 모델에 보낼 sampling params를 만질 수 있다.
// 여기서 agent별 preset을 실제로 적용한다 (지금까지는 문서뿐이었음).
export async function chatParams(_ctx, input, output) {
  try {
    const agent = input?.agent
    if (!agent || !output) return
    const preset = presetForAgent(agent)
    if (!preset) return

    const before = {
      temperature: output.temperature,
    }

    if (typeof preset.temperature === "number") {
      output.temperature = preset.temperature
    }

    await logger.info("chat-params.preset-applied", {
      sessionID: input.sessionID,
      agent,
      preset: preset.name,
      before,
      after: {
        temperature: output.temperature,
      },
    })
  } catch (err) {
    await logger.warn("chat-params", err)
  }
}
