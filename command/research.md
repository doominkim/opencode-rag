---
description: Research broad codebase, repository, or documentation questions.
agent: explore
---

# Research Workflow

Use this command for broad codebase, external repository, or documentation research.

## Rules
- Start with direct `Glob`/`Grep` when the target is local and specific.
- Use the `explore` agent's search tools to split broad research by files, directories, docs, or external sources.
- Do not modify files unless the user explicitly asks for implementation.
- Do not run destructive commands.

## Workflow
1. Define the research question in one sentence.
2. Identify likely files, directories, docs, or external sources.
3. Search local code first when relevant.
4. Split independent research threads when useful.
5. Cross-check findings against primary evidence.
6. Return conclusions with source paths or URLs.

## Research Thread Template
```text
CONTEXT:
[What is being researched and why]

TASK:
[One research goal]

MUST DO:
1. Check the relevant files/docs directly.
2. Return concrete evidence with paths or URLs.
3. Separate facts from recommendations.

MUST NOT DO:
- Do not modify files.
- Do not assume missing details.

VERIFY:
- Cite exact files, docs, or commands used.

OUTPUT FORMAT:
- Findings
- Recommendations
- Risks / unknowns
```

## Final Output
- 핵심 결론
- 근거 파일/문서
- 적용 가능한 아이디어
- 리스크와 미확인 사항
