// @ts-nocheck

export const AGENTS = [
  {
    name: "db-designer",
    category: "preset_deep_think",
    triggers: [/\b(migration|schema|table|index|column|foreign\s*key|primary\s*key|drop|truncate)\b/i],
    reason: "DB/스키마/마이그레이션 변경 키워드",
  },
  {
    name: "api",
    category: "preset_deep_think",
    triggers: [/\b(endpoint|controller|handler|middleware|route|REST|GraphQL|RPC)\b/i],
    reason: "API 계약/핸들러 키워드",
  },
  {
    name: "frontend",
    category: "preset_deep_think",
    triggers: [/\b(aria-|responsive|tailwind|styled-?components|css|tsx|jsx|component|컴포넌트)\b/i],
    reason: "UI/UX 키워드",
  },
  {
    name: "security",
    category: "preset_research",
    triggers: [/\b(auth|permission|authoriz|authenticat|secret|token|CVE|npm\s+audit|injection|XSS|CSRF|SSRF|보안)\b/i],
    reason: "보안/인증/인가 키워드",
  },
  {
    name: "reviewer",
    category: "preset_research",
    triggers: [/\b(review|리뷰|검토|회귀|regression)\b/i],
    reason: "리뷰 요청 키워드",
  },
  {
    name: "verifier",
    category: "preset_quick",
    triggers: [/\b(test|build|lint|tsc|pytest|jest|verify|검증)\b/i],
    reason: "검증/테스트 키워드",
  },
  {
    name: "architect",
    category: "preset_deep_think",
    triggers: [/\b(architecture|아키텍처|설계|refactor|리팩토링|책임|레이어|boundary)\b/i],
    reason: "구조/설계 키워드",
  },
  {
    name: "oracle",
    category: "preset_research",
    triggers: [/^(왜|어떻게|뭐|무엇|언제|어디|why|how|what|when|where)\b/i, /\b(출처|근거|이유)\b/],
    reason: "질문형 prompt",
  },
  {
    name: "librarian",
    category: "preset_quick",
    triggers: [/\b(어디에\s*(둬|두면|있)|file\s+location|naming|명명|컨벤션)\b/i],
    reason: "파일 위치/명명 질의",
  },
  {
    name: "explore",
    category: "preset_research",
    triggers: [/\b(찾아|search|grep|find|위치)\b/i],
    reason: "탐색 의도",
  },
  {
    name: "multimodal-looker",
    category: "preset_research",
    triggers: [/\b(스크린샷|screenshot|figma\.com|figma|design)\b/i],
    reason: "시각 자료 첨부",
  },
  {
    name: "prometheus",
    category: "preset_deep_think",
    triggers: [/\b(plan|계획|마일스톤|단계로\s*분해|broken\s*down)\b/i],
    reason: "플래닝 의도",
  },
  {
    name: "commit-message",
    category: "preset_quick",
    triggers: [
      /(commit\s*message|commit\s*msg|커밋\s*메시지|커밋메시지|커밋\s*메세지|커밋메세지)/i,
      /(커밋\s*만들|커밋해|커밋\s*해|commit\s*만들|commit\s*해|커밋\s*줘|commit\s*줘)/i,
    ],
    reason: "커밋 메시지 작성",
  },
  {
    name: "general-purpose",
    category: "preset_research",
    triggers: [/\b(general-purpose|범용|일반\s*보조|명확히\s*분류되지|fallback)\b/i],
    reason: "범용 fallback/일반 보조 요청",
  },
]
