// @ts-nocheck
import { logger } from "../lib/logger.ts"

// command.execute.before: slash command가 실행되기 직전에 호출.
// output.parts에 추가 파트를 넣으면 명령 실행 전에 합쳐진다.
//
// 우리는 우리 저장소가 정의한 명령에 한해 preflight 안내를 주입한다:
// - /resume-plan <slug>: .plans/<slug>.md 와 .state.json이 있어야 한다는 안내
// - /save-plan <slug>: prometheus가 interview를 먼저 수행하도록 안내
// - /work: theseus가 의도 게이트부터 수행하도록 안내
// - /rag-safe-work: destructive 분류 + 사용자 승인 게이트 안내
//
// 실제 파일 존재 여부 체크는 plugin context에서 fs를 안전하게 쓸 수 있다는 보장이 없으므로
// 여기서는 텍스트 안내만 주입한다 (실제 검증은 호출된 명령/agent가 담당).

const PREFLIGHT = {
  "save-plan": [
    "[command-pre] /save-plan preflight:",
    "- prometheus는 plan 작성 전 interview mode를 우선 검토 (불확실한 요구사항 ≤3개 질문)",
    "- 산출물: .plans/<slug>.md (commit 대상)",
    "- 코드 수정 금지, .plans/ 외 write 금지",
  ],
  "resume-plan": [
    "[command-pre] /resume-plan preflight:",
    "- 필요한 파일: .plans/<slug>.md (plan 본문), .plans/<slug>.state.json (진행 상태)",
    "- 한 번에 한 마일스톤만 실행. 검증 실패 시 다음 단계 진행 금지",
    "- destructive 단계는 사용자 승인 필수",
  ],
  "work": [
    "[command-pre] /work preflight:",
    "- theseus는 의도 게이트(intent gate) 출력부터 수행: [intent] <분류> — 근거",
    "- 위임 contract 6필드 강제: TASK / EXPECTED OUTCOME / REQUIRED TOOLS / MUST DO / MUST NOT DO / CONTEXT",
    "- 검증 게이트 통과 전 종료 금지",
  ],
  "rag-safe-work": [
    "[command-pre] /rag-safe-work preflight:",
    "- sync / ingest / bootstrap / load_docs는 destructive로 분류",
    "- 실행 전: 영향 범위 + 삭제 가능성 + 사용자 승인 필수",
    "- read-only / dry-run 우선",
  ],
}

export async function commandPre(_ctx, input, output) {
  try {
    if (!input || !output) return
    const cmd = input.command
    if (!cmd) return

    const lines = PREFLIGHT[cmd]
    if (!lines) return

    if (Array.isArray(output.parts)) {
      output.parts.push({ type: "text", text: lines.join("\n") })
    }

    await logger.info("command-pre.preflight-injected", {
      sessionID: input.sessionID,
      command: cmd,
    })
  } catch (err) {
    await logger.warn("command-pre", err)
  }
}
