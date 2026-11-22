-- Multi-Document Intelligence Workbench schema (SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS analyses (
  id           TEXT PRIMARY KEY,
  instruction  TEXT NOT NULL,
  provider     TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  result_json  TEXT NOT NULL            -- full structured result (validated with zod on read)
);

CREATE TABLE IF NOT EXISTS documents (
  id           TEXT PRIMARY KEY,
  analysis_id  TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   INTEGER NOT NULL,
  sha256       TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('processed','failed')),
  error        TEXT,
  page_count   INTEGER,
  truncated    INTEGER NOT NULL DEFAULT 0,
  extracted_text TEXT NOT NULL           -- source of truth for provenance checks
);
CREATE INDEX IF NOT EXISTS idx_documents_analysis ON documents(analysis_id);

CREATE TABLE IF NOT EXISTS facts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  field        TEXT NOT NULL,
  value        TEXT NOT NULL,
  quote        TEXT NOT NULL,
  location     TEXT,
  verified     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_facts_document ON facts(document_id);
