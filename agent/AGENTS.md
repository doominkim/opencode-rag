# Agent Definition Rules

- frontmatter에는 description, model, mode, tools, permission을 명확히 둔다.
- read-only agent는 edit/write를 deny로 유지한다.
- 검색은 `rg`를 우선하고 regex 오류를 결과 없음으로 판단하지 않는다.
- destructive, commit, push, migration은 사용자 승인 없이 실행하지 않는다.
- 신규 agent를 추가하면 README, AGENTS.md Delegation Matrix, plugin trigger 필요 여부를 함께 확인한다.
