CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'projects'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'namespaces'
  ) THEN
    ALTER TABLE projects RENAME TO namespaces;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS namespaces (
  id BIGSERIAL PRIMARY KEY,
  namespace_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  root_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rag_documents (
  id BIGSERIAL PRIMARY KEY,
  namespace_id BIGINT NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
  source_key TEXT NOT NULL DEFAULT 'legacy',
  source_document_id TEXT,
  source_type TEXT,
  record_type TEXT,
  knowledge_class TEXT,
  domain TEXT,
  status TEXT,
  source_url TEXT,
  source_updated_at TIMESTAMPTZ,
  path_array JSONB,
  parent_source_id TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  source_path TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (namespace_id, source_path)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'namespaces' AND column_name = 'project_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'namespaces' AND column_name = 'namespace_key'
  ) THEN
    ALTER TABLE namespaces RENAME COLUMN project_key TO namespace_key;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rag_documents' AND column_name = 'project_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rag_documents' AND column_name = 'namespace_id'
  ) THEN
    ALTER TABLE rag_documents RENAME COLUMN project_id TO namespace_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'index_runs' AND column_name = 'project_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'index_runs' AND column_name = 'namespace_id'
  ) THEN
    ALTER TABLE index_runs RENAME COLUMN project_id TO namespace_id;
  END IF;
END $$;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS source_key TEXT;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS source_document_id TEXT;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS source_type TEXT;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS record_type TEXT;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS knowledge_class TEXT;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS domain TEXT;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS source_url TEXT;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS path_array JSONB;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS parent_source_id TEXT;

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE rag_chunks
  ADD COLUMN IF NOT EXISTS embedding_model TEXT;

UPDATE rag_documents
SET source_key = COALESCE(
  NULLIF(source_key, ''),
  NULLIF(metadata->>'source_key', ''),
  CASE
    WHEN source_path LIKE 'memory_bank/%' THEN 'memory_bank'
    WHEN source_path LIKE 'notion_company_tree/%' THEN 'notion_company_tree'
    WHEN source_path LIKE 'repo_docs/%' THEN split_part(source_path, '/', 2)
    ELSE 'legacy'
  END
)
WHERE source_key IS NULL OR source_key = '';

UPDATE rag_documents
SET source_document_id = COALESCE(NULLIF(source_document_id, ''), NULLIF(metadata->>'source_document_id', ''))
WHERE source_document_id IS NULL OR source_document_id = '';

UPDATE rag_documents
SET source_type = COALESCE(NULLIF(source_type, ''), NULLIF(metadata->>'source_type', ''))
WHERE source_type IS NULL OR source_type = '';

UPDATE rag_documents
SET record_type = COALESCE(NULLIF(record_type, ''), NULLIF(metadata->>'record_type', ''))
WHERE record_type IS NULL OR record_type = '';

UPDATE rag_documents
SET knowledge_class = COALESCE(NULLIF(knowledge_class, ''), NULLIF(metadata->>'knowledge_class', ''))
WHERE knowledge_class IS NULL OR knowledge_class = '';

UPDATE rag_documents
SET domain = COALESCE(NULLIF(domain, ''), NULLIF(metadata->>'domain', ''))
WHERE domain IS NULL OR domain = '';

UPDATE rag_documents
SET status = COALESCE(NULLIF(status, ''), NULLIF(metadata->>'status', ''))
WHERE status IS NULL OR status = '';

UPDATE rag_documents
SET source_url = COALESCE(NULLIF(source_url, ''), NULLIF(metadata->>'source_url', ''))
WHERE source_url IS NULL OR source_url = '';

UPDATE rag_documents
SET source_updated_at = COALESCE(source_updated_at, NULLIF(metadata->>'source_updated_at', '')::timestamptz)
WHERE source_updated_at IS NULL;

UPDATE rag_documents
SET path_array = COALESCE(path_array, metadata->'path_array')
WHERE path_array IS NULL;

UPDATE rag_documents
SET parent_source_id = COALESCE(NULLIF(parent_source_id, ''), NULLIF(metadata->>'parent_source_id', ''))
WHERE parent_source_id IS NULL OR parent_source_id = '';

ALTER TABLE rag_documents
  ALTER COLUMN source_key SET DEFAULT 'legacy';

ALTER TABLE rag_documents
  ALTER COLUMN source_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rag_documents_namespace_source_document_id
  ON rag_documents(namespace_id, source_key, source_document_id)
  WHERE source_document_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS rag_chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  token_count INT,
  embedding vector(1536),
  embedding_model TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS index_runs (
  id BIGSERIAL PRIMARY KEY,
  namespace_id BIGINT NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_rag_documents_namespace_id
  ON rag_documents(namespace_id);

CREATE INDEX IF NOT EXISTS idx_rag_documents_namespace_source_key
  ON rag_documents(namespace_id, source_key);

CREATE INDEX IF NOT EXISTS idx_rag_documents_source_path
  ON rag_documents(source_path);

CREATE INDEX IF NOT EXISTS idx_rag_documents_source_document_id
  ON rag_documents(source_key, source_document_id);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_document_id
  ON rag_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding
  ON rag_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_index_runs_namespace_id
  ON index_runs(namespace_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_rag_documents_knowledge_class'
  ) THEN
    ALTER TABLE rag_documents
      ADD CONSTRAINT chk_rag_documents_knowledge_class
      CHECK (knowledge_class IS NULL OR knowledge_class IN ('source', 'derived'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_index_runs_status'
  ) THEN
    ALTER TABLE index_runs
      ADD CONSTRAINT chk_index_runs_status
      CHECK (status IN ('running', 'completed', 'failed'));
  END IF;
END $$;
