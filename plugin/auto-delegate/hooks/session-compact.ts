// @ts-nocheck
import { logger } from "../lib/logger.ts"

// experimental.session.compacting: 세션 압축 시 추가 컨텍스트 / 프롬프트를 주입.
// 압축은 길어진 대화를 요약 → 새 세션으로 재시작하므로,
// orchestrator 정체성·진행 중 plan·위임 정책이 누락되기 쉽다.
// 이 hook은 압축 prompt에 "보존해야 할 항목" 체크리스트를 컨텍스트로 추가한다.
//
// `prompt`는 손대지 않는다 (전체 교체는 위험). `context` 배열에만 append.

const PRESERVE_CHECKLIST = [
  "[auto-delegate] 압축 시 반드시 보존할 항목:",
  "- 현재 active orchestrator (theseus 등)와 의도 게이트 결과",
  "- 진행 중 plan slug와 마일스톤 위치 (.plans/<slug>.md, .plans/<slug>.state.json)",
  "- 위임 흐름: 어떤 specialist에 무엇을 위임했고, 결과/검증 상태가 어떤지",
  "- destructive 명령 승인 대기 항목",
  "- 사용자가 명시한 제약 (요구사항, MUST DO / MUST NOT DO)",
  "- 실패한 검증과 재시도 횟수",
  "- 디폴트 바이어스 = DELEGATE (이 저장소 정책)",
].join("\n")

export async function sessionCompacting(_ctx, input, output) {
  try {
    if (!output) return
    if (Array.isArray(output.context)) {
      output.context.push(PRESERVE_CHECKLIST)
    }
    await logger.info("session-compact.preserve-checklist", {
      sessionID: input?.sessionID,
    })
  } catch (err) {
    await logger.warn("session-compact", err)
  }
}
