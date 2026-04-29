// @ts-nocheck

// preset 이름 → 모델 파라미터.
// model 자체는 chat.params hook에서 변경할 수 없으므로(SDK 제약) temperature와
// maxOutputTokens만 override 한다. 모델 선택은 사용자가 직접 한다.
export const PRESETS = {
  "deep-think": { temperature: 0.4, maxOutputTokens: 16384 },
  "research":   { temperature: 0.3, maxOutputTokens: 4096 },
  "quick":      { temperature: 0.2, maxOutputTokens: 1024 },
  "cheap-bulk": { temperature: 0.1, maxOutputTokens: 2048 },
}

// agent 이름 → preset.
// agent.ts의 category 표기와 일치시킨다.
export const AGENT_PRESET = {
  "architect":         "deep-think",
  "prometheus":        "deep-think",
  "metis":             "deep-think",
  "api":               "deep-think",
  "backend":           "deep-think",
  "db-designer":       "deep-think",
  "frontend":          "deep-think",
  "security":          "research",
  "reviewer":          "research",
  "oracle":            "research",
  "explore":           "research",
  "general-purpose":   "research",
  "multimodal-looker": "research",
  "verifier":          "quick",
  "librarian":         "quick",
  "commit-message":    "quick",
}

export function presetForAgent(agent) {
  const name = AGENT_PRESET[agent]
  if (!name) return null
  return { name, ...PRESETS[name] }
}
