---
name: deep-think
description: 큰 추론, 설계, 위험 검토용 고비용 프리셋.
model: openai/gpt-5.5
temperature: 0.4
max_tokens: 16384
---

# Deep-think Preset

## 용도
- 아키텍처 결정
- 큰 리팩토링 plan
- 운영 영향 검토
- 마이그레이션 위험 분석

## 비용 프로필
- 고비용 / 고지연
- 컨텍스트 적층 가능

## 사용 시 주의
- 단순 답변에는 과함 → `quick`
- 외부 탐색이 주된 작업이면 `research`가 더 적합
