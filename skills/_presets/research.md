---
name: research
description: 코드/문서 탐색과 요약 중심의 중간 비용 프리셋.
model: openai/gpt-5.4
temperature: 0.3
max_tokens: 4096
---

# Research Preset

## 용도
- 넓은 코드 탐색
- 외부 repo/문서 분석
- 다중 파일 비교, 요약

## 비용 프로필
- 중간 비용 / 중간 지연
- 도구 호출 다수 허용 (Glob, Grep, WebFetch)

## 사용 시 주의
- 결정/구현 단계에는 부적합 → `deep-think`
- 단순 수정에는 과함 → `quick`
