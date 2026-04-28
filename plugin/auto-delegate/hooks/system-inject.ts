// @ts-nocheck
import { logger } from "../lib/logger.ts"

const ROUTING_REMINDER = [
  "[auto-delegate] 자동 위임 권고 (사용자 override가 항상 우선):",
  "- DB(schema/migration/index) → db-designer",
  "- API(endpoint/handler/middleware) → api",
  "- UI/UX(component/tailwind/aria) → frontend (스크린샷이면 multimodal-looker 선행)",
  "- 보안(auth/secret/CVE) → security",
  "- 변경 리뷰 → reviewer",
  "- 큰 작업 plan → prometheus → metis (실행)",
  "- 질문/근거 추적 → oracle",
  "- 파일 위치/명명 → librarian",
  "- 검증/빌드/테스트 → verifier",
  "- 커밋 메시지 → api-commit-message",
  "- 코드 탐색 → explore",
  "- 구조/책임 배치 → architect",
  "router가 prompt 패턴을 감지하면 추가 reminder를 붙입니다. 무시하고 직접 처리해도 됩니다.",
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
