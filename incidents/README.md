# Incidents

`incidents/`는 harness 정책의 근거를 보관하는 디렉터리다.

## 목적

규칙, hook, agent boundary, test가 왜 생겼는지 추적 가능하게 만든다. 모든 incident는 실제 실패와 그 실패를 막기 위해 추가한 harness 변경을 함께 기록한다.

## 생성 기준

생성한다:
- agent, hook, 정책이 의도와 다르게 동작한 실제 실패
- destructive gate, routing, verification, persistence, plan resume 같은 harness 기능의 false positive 또는 false negative
- 사용자가 문제를 보고했고, 이를 막기 위해 `AGENTS.md`, hook, test, command, agent prompt, docs 중 하나를 바꾼 경우

생성하지 않는다:
- 단순 typo, 이름 변경, 일반 refactor
- harness 변경이 없는 일반 코드 버그
- 재발 메커니즘이 없는 일회성 사용자 실수

## Decision Flow

```text
사고 발생
  |
  v
이 사고를 막기 위해 harness 변경을 했는가?
  |-- yes --> incidents/YYYY-MM-DD-<short-slug>.md 작성
  |-- no  --> commit message 또는 일반 문서로 충분
```

## Naming

```text
YYYY-MM-DD-<short-slug>.md
```

- 날짜는 발생일 기준
- slug는 실패 패턴을 짧게 표현
- 같은 날 여러 건이면 slug로 구분

## Template

```markdown
# <title>

## What Failed
...

## Why
...

## What Was Added To Harness
...

## How To Verify
...

## Related
...
```
