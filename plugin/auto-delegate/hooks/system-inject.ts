// @ts-nocheck
import { logger } from "../lib/logger.ts"

const ROUTING_REMINDER = [
  "[auto-delegate] 위임 정책 (사용자 override가 항상 우선):",
  "user prompt가 아래 도메인 키워드와 매칭되면, 직접 처리 전에 Task tool로 위임할지 먼저 결정한다.",
  "- DB(schema/migration/index) → db-designer",
  "- API(endpoint/handler/middleware) → api",
  "- UI/UX(component/tailwind/aria) → frontend (스크린샷이면 multimodal-looker 선행)",
  "- 보안(auth/secret/CVE) → security",
  "- 변경 리뷰 → reviewer",
  "- 큰 작업 plan → prometheus → metis (실행)",
  "- 질문/근거 추적 → oracle",
  "- 파일 위치/명명 → librarian",
  "- 검증/빌드/테스트 → verifier",
  "- 커밋 메시지 → commit-message (도메인 무관, 모든 변경에 사용)",
  "- 코드 탐색 → explore",
  "- 구조/책임 배치 → architect",
  "- 분류가 애매한 일반 보조 → general-purpose (단, 구체 specialist가 있으면 specialist 우선)",
  "Task subagent_type에는 등록된 agent id만 사용한다. general-purpose fallback agent가 등록되어 있으나 남용하지 않는다.",
  "auto-delegate router가 매칭하면 user message 끝에 confidence와 Task 호출 템플릿을 주입한다.",
  "HIGH/explicit confidence는 위임을 우선하고, MEDIUM은 직접 처리도 허용한다.",
].join("\n")

export async function systemInject(_ctx, _input, output) {
  try {
    if (!output) return
    if (Array.isArray(output.system)) {
      output.system.push(ROUTING_REMINDER)
      return
    }
    if (typeof output.system === "string") {
      output.system = output.system + "\n\n" + ROUTING_REMINDER
    }
  } catch (err) {
    await logger.warn("system-inject", err)
  }
}
