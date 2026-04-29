// @ts-nocheck
import { logger } from "../lib/logger.ts"

// experimental.compaction.autocontinue: 압축 후 합성 user "continue" 메시지를 보낼지 결정.
// theseus orchestrator는 "끝까지 멈추지 않는다"가 정체성이므로,
// theseus(또는 metis = plan executor) 세션은 자동 continue를 켠다.
// 그 외 일반 세션은 OpenCode 기본값(true)을 따른다.
//
// overflow=true (실제 컨텍스트 초과)일 때만 자동 continue가 큰 의미를 갖는다.
// destructive 진행 중이라면 사용자 결정이 필요하므로 자동 continue를 끈다.

const PERSISTENT_AGENTS = new Set(["theseus", "metis"])

export async function autoContinue(_ctx, input, output) {
  try {
    if (!input || !output) return
    const agent = input.agent
    const overflow = !!input.overflow

    if (PERSISTENT_AGENTS.has(agent)) {
      output.enabled = true
      await logger.info("auto-continue.persist", {
        sessionID: input.sessionID,
        agent,
        overflow,
      })
      return
    }

    // 그 외엔 기본값을 보존 (output.enabled를 손대지 않음).
    await logger.info("auto-continue.default", {
      sessionID: input.sessionID,
      agent,
      overflow,
      enabled: output.enabled,
    })
  } catch (err) {
    await logger.warn("auto-continue", err)
  }
}
