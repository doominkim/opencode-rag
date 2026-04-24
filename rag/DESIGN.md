# Global RAG Design

## 목표
- 전역에서 재사용 가능한 멀티 소스 도메인 지식 검색 계층
- source는 Notion에 한정하지 않음
- 예: Notion, 약품 마스터 DB, 기타 도메인 데이터셋

## 핵심 원칙
- source별 reader는 분리하고, 저장 모델은 공통화한다.
- 검색 단위는 `chunk`, 동기화 단위는 `document`로 통일한다.
- source마다 authority가 다를 수 있으므로 field/category별 우선순위를 둔다.
- raw code는 RAG의 주 source가 아니라 보조 검증 source로 둔다.

## 대화 메모리의 역할
- 이 RAG는 문서 검색만이 아니라 **세션이 바뀌어도 유지되는 메모리 계층**을 포함한다.
- 메모리에는 아래가 들어갈 수 있다.
  - 규칙으로 확정된 선호
  - 아직 규칙까지는 아니지만 반복적으로 드러난 뉘앙스
  - 특정 프로젝트에서 중요하게 여기는 판단 기준
  - 다음 세션에서도 이어져야 하는 결정사항
- 단, 메모리는 자동 진실이 아니라 **재확인 가능한 힌트 + 장기 컨텍스트**로 취급한다.

## 역할 분해
- Source Sync: 외부 원천에서 raw snapshot 수집
- Normalization/Curator: raw 데이터를 공통 document 형태로 정리
- Indexer: document -> chunk/embedding 갱신
- Scheduler/Run: 주기 실행과 실행 이력 관리

## Source vs Derived
- `source`: 원본에 가까운 데이터
  - 예: Notion page 원문, 약품 마스터 row
- `derived`: 정리/요약/시나리오별 재구성 결과
  - 예: 운영 규칙 요약, FAQ형 문서, 시나리오별 정리본
- metadata 권장 키:
  - `knowledge_class`: `source | derived`
  - `derived_from`
  - `derivation_type`
  - `scenario_key`

## Source Policy
| source_key | source_type | 원본 단위 | document 단위 | 주 용도 |
| --- | --- | --- | --- | --- |
| `notion` | `api/content-tree` | page | page 1개 = document 1개 | 정책, 운영 절차, FAQ, 용어집 |
| `drug_master` | `db/structured` | drug row | drug 1개 = document 1개 | 코드, 규격, 분류, 약품 기본 사실 |
| `memory_bank` | `curated/memory` | memory note | memory note 1개 = document 1개 | 선호, 뉘앙스, 결정사항, 코딩 성향 |
| `manual` | `file/text` | file | file 1개 = document 1개 | 수동 메모, 예외 문서 |

## Notion page tree 설명
- Notion page tree는 페이지의 부모-자식 구조다.
- 예: `운영위키 > 반품정책 > 백제`
- 여기서 `백제` 페이지를 document로 저장하되, `path_array=["운영위키", "반품정책", "백제"]`를 메타데이터로 같이 저장한다.
- 즉 page tree는 문서를 쪼개는 기준이 아니라, 문서의 소속 경로를 나타내는 정보다.

### 현재 운영 전제
- 현재 Notion source는 **페이지 트리 기준**으로 관리된다고 가정한다.
- 따라서 MVP에서는 `page 1개 = document 1개`로 두고,
  블록/섹션은 추후 chunk 단계에서 분해한다.
- 상위 페이지 경로는 `path_array`, 직접 부모는 `parent_source_id`로 저장한다.

## Canonical Model
### Document
- source가 무엇이든 먼저 document로 정규화한다.
- 권장 필드:
  - `source_key`
  - `source_document_id`
  - `title`
  - `canonical_text`
  - `path`
  - `checksum`
  - `source_updated_at`
  - `metadata`
  - `is_deleted`

### Chunk
- 검색/임베딩은 chunk 단위로 한다.
- 권장 필드:
  - `document_id`
  - `chunk_index`
  - `content`
  - `token_count`
  - `embedding`
  - `embedding_model`
  - `metadata`

## Metadata Draft
### 공통 document metadata
```json
{
  "source_type": "notion | drug_master | memory_bank | manual",
  "record_type": "page | drug | memory | file",
  "domain": "inventory",
  "tags": ["재고", "반품"],
  "path_array": ["운영위키", "반품정책", "백제"],
  "source_url": "https://...",
  "source_updated_at": "2026-04-22T00:00:00Z",
  "authority_level": 50,
  "status": "approved",
  "knowledge_class": "source | derived",
  "scenario_key": "coding-preferences",
  "memory_type": "rule | preference | nuance | context | decision | anti_pattern",
  "stability": "stable | tentative",
  "confidence": 0.9,
  "last_confirmed_at": "2026-04-22T00:00:00Z"
}
```

### drug master 전용 metadata
```json
{
  "record_type": "drug",
  "drug_code": "MSUP_STD_CD",
  "product_name": "OO정",
  "ingredient_name": "OOO",
  "manufacturer": "OO제약",
  "status": "active"
}
```

## Retrieval 원칙
- 1차 필터: `source_key`, `domain`, `status`
- 2차 검색: 벡터 검색 또는 텍스트 검색
- 3차 가중치: authority, freshness, exact keyword hit
- 같은 저장소에 embedding model이 섞일 수 있으므로, query vector는 `embedding_model`별로 맞춰 비교한다.
- 응답에는 항상 citation을 포함한다.

## Source-of-truth 정책
- 약품 코드/규격/분류: `drug_master` 우선
- 운영 가이드/프로세스/FAQ: `notion` 우선
- 사용자 선호/코딩 뉘앙스/프로젝트 기억: `memory_bank` 우선
- 충돌 시에는 field/category별 authoritative source를 우선한다.

## 메모리 운용 원칙
- `memory_bank`는 “오랜만에 만나도 이어질 기억”을 저장하는 계층이다.
- 메모리는 아래처럼 구분한다.
  - `rule`: 이미 확정된 규칙
  - `preference`: 강한 선호
  - `nuance`: 설명하기 어렵지만 자주 반복되는 경향
  - `context`: 다음 세션에도 이어져야 하는 배경
  - `decision`: 합의된 결정
  - `anti_pattern`: 피하고 싶은 방식
- 메모리는 항상 `stability`와 `confidence`를 함께 둔다.
- `tentative` 메모리는 다음 세션에서 재확인 질문을 허용한다.
- raw memory 파일이 여러 개일 수 있으므로 destructive sync는 `collection_key` 단위로만 수행한다.

## 운영 메모
- Notion snapshot은 빈 payload를 기본 거부한다. 의도적 전체 삭제일 때만 명시적으로 허용한다.
- `record_type`, `domain`, `status`는 확장 가능한 값으로 두되, `knowledge_class`는 현재 `source | derived`만 허용한다.

## MVP 범위
1. source 3종
   - `notion`
   - `drug_master`
   - `memory_bank`
2. 공통 document/chunk 저장
3. source별 ingestion
4. 검색 시 source 필터와 citation 지원

## 다음 구현 순서
1. `source-policy.json` 확정
2. `sync_drug_master.py` 구현
3. `sync_notion.py` 구현
4. `rag_documents` / `rag_chunks` 적재
5. `embed_and_upsert.py` 구현
6. `search.py`를 source filter + vector search로 확장
7. `jobs/*.json` 과 `run_job.py` 로 주기 실행 단위 고정
