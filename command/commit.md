---
description: 현재 git status 기준으로 커밋 메시지를 생성합니다. (commit 자체는 사용자가 실행)
---

# /commit

현재 변경사항의 커밋 메시지를 생성한다. 가능하면 `commit-message` agent에게 위임하되, agent model/provider 문제가 발생하면 primary agent가 같은 규칙으로 직접 작성한다.

## 진입 시 commit-message agent가 수행할 것

1. `git status --short` 실행
2. 변경된 파일 목록만 기반으로 판단 (`git diff` / `git show` 금지)
3. type(scope): 한국어 요약 형식으로 생성
4. 변경이 여러 의도면 commit 분리 제안

## 출력 형식

1. 바로 복사 가능한 최종 커밋 메시지를 하나의 fenced code block으로 먼저 출력한다.
2. 설명이 필요하면 코드 블록 뒤에 `판단 근거:`와 `주의사항:`만 간단히 작성한다.
3. `본문을 넣는다면`, `대안`, `필요하면` 같은 조건부 안내 문구는 쓰지 않는다.
4. alternate message는 사용자가 명시적으로 요청한 경우에만 제공한다.

## 사용 시점

- 작업이 끝났고 git status에 변경이 있다
- 메시지 형식·문구를 다듬어야 한다
- 변경이 여러 의도면 commit 분리 검토가 필요하다

## 사용하지 않을 시점

- 변경이 한 줄/typo라 메시지가 자명함 → 직접 작성이 더 빠름
- commit 자체를 실행해야 한다 → 이 명령은 메시지만 생성. commit은 사용자가 직접

## 금지

- commit 실행 (사용자 승인 영역)
- 파일 수정
- diff/show로 본문 변경 추측 (status에 보이는 파일 목록만 기준)
