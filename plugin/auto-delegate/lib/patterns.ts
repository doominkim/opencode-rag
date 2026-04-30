// @ts-nocheck
import { PERMISSION_RULES } from "./permissions.ts"

export const DESTRUCTIVE_PATTERNS = PERMISSION_RULES
  .filter((rule) => rule.action === "ask" && rule.re)
  .map((rule) => ({ name: rule.id, re: rule.re, reason: rule.reason }))

export function detectDestructive(command) {
  for (const p of DESTRUCTIVE_PATTERNS) {
    if (p.re.test(command)) return p
  }
  return null
}
