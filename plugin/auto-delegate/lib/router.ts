// @ts-nocheck
import { AGENTS } from "./agents.ts"

// 명시적 위임 표기: "@<agent>" 또는 "/<agent>" 가 prompt 첫 토큰에 있을 때.
const EXPLICIT_RE = /(^|\s)[@/]([a-z][a-z0-9-]+)\b/i

const KNOWN_AGENT = new Set(AGENTS.map((a) => a.name))

export function matchAgent(text) {
  const hits = []
  for (const a of AGENTS) {
    if (a.triggers.some((re) => re.test(text))) {
      hits.push({ agent: a.name, category: a.category, reason: a.reason })
    }
  }
  return hits.slice(0, 3)
}

// router 결정. confidence 산출 규칙:
// - explicit: prompt에 @<agent> / <agent> 직접 호출이 있고 알려진 agent
// - high: 서로 다른 trigger가 2개 이상 매칭, 또는 단일 매칭이지만 단일 agent 전용 강한 키워드
// - medium: 단일 agent 매칭
// - none: 매칭 없음
export function route(text) {
  const explicit = EXPLICIT_RE.exec(text || "")
  if (explicit && KNOWN_AGENT.has(explicit[2])) {
    return {
      confidence: "explicit",
      agents: [{ agent: explicit[2], category: "explicit", reason: "사용자가 명시적으로 호출" }],
    }
  }

  const hits = matchAgent(text || "")
  if (hits.length === 0) return { confidence: "none", agents: [] }
  if (hits.length >= 2) return { confidence: "high", agents: hits }
  return { confidence: "medium", agents: hits }
}
