---
name: quick
description: 저비용, 빠른 응답이 필요한 단순 작업용 프리셋.
model: openai/gpt-5.4-mini-fast
temperature: 0.2
---

# Quick Preset

## 용도
- 단순 수정, 1파일 변경
- 짧은 답변, 명확한 사실 질의
- 분기 결정이 단순한 작업

## 비용 프로필
- 저비용 / 저지연
- 깊은 추론 불필요

## 사용 시 주의
- 큰 코드 베이스 탐색에는 부적합 → `research`
- 모호한 요구사항에는 부적합 → `deep-think` 또는 직접 처리
