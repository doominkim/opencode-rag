# grep BRE Parentheses Failure

## What Failed

OpenCode 작업 중 기본 `grep`에 ERE/PCRE 스타일 패턴이 전달되어 검색이 실패했다.

```text
grep: parentheses not balanced
```

문제 패턴 예시:

```text
where\(`|andWhere\(`|orderBy\(`|leftJoinAndSelect\(|leftJoin\(|console\.log
```

## Why

기본 `grep`은 BRE(Basic Regular Expression)를 사용한다. BRE에서 `\(`는 literal `(`가 아니라 group 시작으로 해석되고, `|`는 alternation이 아니다. ERE/PCRE로 의도한 패턴을 기본 `grep`에 넘겨 group balance 오류가 발생했다.

## What Was Added To Harness

- `AGENTS.md`에 `Search Conventions` 추가
- 주요 `agent/*.md`에 `rg` 우선 검색 규칙 추가
- 검색 regex 오류를 결과 없음으로 판단하지 말고 `rg` 또는 `grep -E`로 재실행하도록 명시

## How To Verify

```bash
printf 'where(`\nandWhere(`\nconsole.log\n' | rg -n 'where\(`|andWhere\(`|console\.log'
printf 'where(`\nandWhere(`\nconsole.log\n' | grep -En 'where\(`|andWhere\(`|console\.log'
```

두 명령 모두 match를 출력해야 한다.

## Related

- Fix commit: `05dbb30`
- Files: `AGENTS.md`, `agent/*.md`
