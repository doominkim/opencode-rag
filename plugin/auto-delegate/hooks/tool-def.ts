// @ts-nocheck
import { logger } from "../lib/logger.ts"

// tool.definition: LLM에 전달되는 tool description / parameter를 변경.
// Task tool description에 "DELEGATE 디폴트" 정책을 prepend해
// 모델이 매 호출마다 위임 우선 정책을 인식하도록 한다.

const TASK_PREAMBLE = [
  "[auto-delegate policy]",
  "이 저장소의 디폴트 바이어스는 DELEGATE 다.",
  "위임이 디폴트, 직접 작업은 super simple할 때만 (단일 줄 fix / typo / 한 문장 답변).",
  "Task 호출 시 6필드 contract 권장: TASK / EXPECTED OUTCOME / REQUIRED TOOLS / MUST DO / MUST NOT DO / CONTEXT.",
  "subagent_type은 등록된 agent id만 사용한다. 일반 fallback이 필요하면 general-purpose agent가 등록되어 있다.",
  "가능하면 general-purpose보다 api/backend/db-designer/frontend/reviewer/verifier 등 구체 specialist를 우선한다.",
  "독립적인 영역은 한 메시지에 다중 Task 콜로 병렬 호출.",
  "",
].join("\n")

const PATCH_TARGETS = new Set(["task"])

export async function toolDef(_ctx, input, output) {
  try {
    if (!input || !output) return
    const id = (input.toolID || "").toLowerCase()
    if (!PATCH_TARGETS.has(id)) return
    if (typeof output.description !== "string") return

    output.description = TASK_PREAMBLE + output.description

    await logger.info("tool-def.patched", {
      toolID: id,
      addedChars: TASK_PREAMBLE.length,
    })
  } catch (err) {
    await logger.warn("tool-def", err)
  }
}
