# ARCHITECTURE

## Components
```
┌──────────── client (React + Vite, :5173) ────────────┐
│ UploadPanel · instruction box · ResultView (5 tabs)   │
└───────────────┬──────────────────────────────────────┘
                │ multipart POST /api/analyses  (Vite proxies /api)
┌───────────────▼────────── server (Express, :3001) ───┐
│ helmet · cors · rate-limit · multer(memory)           │
│ pipeline/*  ──►  llm/{anthropic|mock}  ──► SQLite     │
└───────────────────────────────────────────────────────┘
        shared/ : zod schemas, types, normalisers, Markdown export
```

## Pipeline stages
```
files ─► 1 INGEST (per file, isolated) ─► 2 EXTRACT FACTS (per doc, per chunk) ─► 3 COMPARE ─► 4 INTERPRET ─► 5 PERSIST
```
| # | Stage | Module | Uses AI? | Output |
|---|---|---|---|---|
| 1 | Ingest: sanitise name, sniff type, extract text, truncate, chunk | `validate`, `extract`, `csv`, `chunk` | no | `SourceDocument` (processed/failed) |
| 2 | Fact extraction, bounded concurrency (`LLM_CONCURRENCY`) | `analyze`, provider | **yes** | `RawFact[]` → `Fact` with `Evidence` (quote located, page/line, verified) |
| 3 | Group facts by normalised field, check consistency | `compare` | no | `ComparisonRow[]` |
| 4 | Summary, discrepancies, missing info over **facts only** | provider | **yes** | `RawInterpretation` → citations re-resolved & verified |
| 5 | Save analysis, documents, facts in one transaction | `db/index.ts` | no | `AnalysisResult` returned (201) |

## Sequence
```
Browser        Express          Pipeline            Provider           SQLite
  │ POST files+instr │                │                  │                │
  │─────────────────►│ validate req   │                  │                │
  │                  │───────────────►│ ingest each file │                │
  │                  │                │ extractFacts(chunk)──►            │
  │                  │                │◄──── raw facts ───│               │
  │                  │                │ verify quotes; build rows         │
  │                  │                │ interpret(facts,rows)──►          │
  │                  │                │◄──── raw interp ──│               │
  │                  │                │ resolve+verify citations          │
  │                  │◄───────────────│ result                            │
  │                  │ save ──────────────────────────────────────────────►
  │◄─────── 201 AnalysisResult ──────│
```

## Failure paths
| Failure | Behaviour |
|---|---|
| Unsupported / corrupt / empty / binary / image file | That document → `failed` with reason; others continue. Warning shown. |
| **All** documents failed | HTTP 422 with per-file reasons; nothing saved. |
| Only one readable document | 201 with warning "no cross-document comparison possible". |
| File > 10 MB / > 8 files / missing instruction / instruction > 2000 chars | 413 / 400 / 400 / 400, clear message. |
| PDF parse hangs | `EXTRACT_TIMEOUT_MS` → document failed. PDF parse retried up to 3× (pdf.js xref quirk). |
| Document longer than `MAX_DOC_CHARS` | Truncated, warning shown. |
| Model fails on one chunk | Warning; other chunks continue. |
| Model returns malformed output | Zod rejects it; treated as chunk/interpretation failure. |
| Interpretation step fails | Facts + deterministic table still returned, summary explains it. |
| Quote not found in source | Fact/evidence kept but `verified=false` (⚠), warning count shown. |
| Citation to unknown document id | Dropped, warning recorded. |
| Unexpected exception | Logged server-side; client sees generic 500. |

## Trust model
1. **Document text** is ground truth.
2. A **fact** is trusted only with a verbatim quote that the *server* located.
3. The **comparison** is deterministic code over facts.
4. **Interpretation** is AI judgement over facts, labelled as such, with citations re-verified.

## Data model
See `server/src/db/schema.sql`: `analyses` (full JSON result) ← `documents` (extracted text, status) ← `facts` (field, value, quote, location, verified).

## API
`GET /api/health` · `GET /api/config` · `GET /api/analyses` · `GET /api/analyses/:id` · `POST /api/analyses` (multipart: `instruction`, `files[]`).
