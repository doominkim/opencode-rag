// @ts-nocheck
import { AGENTS } from "./agents.ts"

export function matchAgent(text) {
  const hits = []
  for (const a of AGENTS) {
    if (a.triggers.some((re) => re.test(text))) {
      hits.push({ agent: a.name, category: a.category, reason: a.reason })
    }
  }
  return hits.slice(0, 3)
}
