# Multi-Document Intelligence Workbench

Upload several documents, give an analysis instruction, and get a structured comparison where **every finding names the document (and page/line) it came from**.

React + Vite + TypeScript (client) · Node + Express + TypeScript (server) · SQLite (`better-sqlite3`) · Zod-validated structured output · Anthropic Claude **or** a fully offline mock provider.

## Documentation map
| File | Purpose |
|---|---|
| [CONTEXT.md](CONTEXT.md) | Glossary of project terms |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stages, sequence, failure paths |
| [SETUP.md](SETUP.md) | Install steps and troubleshooting |
| [DEMO.md](DEMO.md) | Six-minute walkthrough script |
| [QUESTIONS.md](QUESTIONS.md) | Verified prompts, including refused inputs |
| [PRODUCTION.md](PRODUCTION.md) | Path to production |
| [MYPROCESS.md](MYPROCESS.md) | Build process and AI disclosure (fill in your own details) |
| [backend testing.md](backend%20testing.md) | Backend test notes |
| [AGENTS.md](AGENTS.md) | Instructions for coding agents |
| [docs/BEGINNER_GUIDE.md](docs/BEGINNER_GUIDE.md) | Plain-language tour of the project |
| [docs/adr/](docs/adr) | Ten architecture decision records |

## Quick start

```bash
npm install
cp .env.example .env     # optional – works with defaults, no API key needed
npm run seed             # optional – pre-loads one analysis of the sample documents
npm run dev              # API :3001, UI http://localhost:5173
```

Try it: drag the files from [`samples/licence-application/`](samples/licence-application) into the UI and use
*“Highlight discrepancies in names, addresses, licence details, or revenue figures.”*
`samples/company-financials/` supports *“Compare the financial position of the companies.”*

Tests: `npm test` · Typecheck: `npm run typecheck` · Regenerate sample PDF: `npm run samples`

To use a real model set `ANTHROPIC_API_KEY` in `.env` (provider switches automatically).

## Architecture

```
client (React)  ──multipart──▶  POST /api/analyses  (server/src/app.ts)
                                   │
        ┌──────────────────────────┴──────────────────────────────────┐
        │ 1 ingest   validate (ext + magic bytes) → extract text (pdf-parse / txt / md / csv)
        │            → truncate at MAX_DOC_CHARS → chunk (≈8k chars, overlap)
        │ 2 extract  per document, per chunk, bounded concurrency → facts {field,value,quote}
        │            server locates each quote in the source text → Evidence{doc,page/line,verified}
        │ 3 compare  deterministic grouping of facts by normalised field; consistency check (no AI)
        │ 4 interpret LLM sees only the extracted facts (not raw docs mashed together) →
        │            summary, discrepancies, missing info; citations re-resolved & verified server side
        └──────────────────────────┬──────────────────────────────────┘
                                   ▼
                        SQLite: analyses / documents / facts   (server/src/db/schema.sql)
```

* `shared/` – Zod schemas + TS types used by both sides, and the Markdown export used by “Copy”.
* `server/src/pipeline/` – `validate`, `extract`, `csv`, `chunk`, `provenance`, `compare`, `analyze` (orchestrator): each stage is a small, independently testable module.
* `server/src/llm/` – `LlmProvider` interface with `anthropic.ts` (forced tool-use for structured JSON, Zod-parsed) and `mock.ts`.

### Facts vs. interpretation
* **Extracted fact** (green badge): a value + verbatim quote. The server checks the quote exists in that document; unverifiable quotes are flagged ⚠.
* **AI interpretation** (purple badge): summary, discrepancies, missing-information. Always cites evidence, and is generated from facts, not from free text.
* The comparison table itself is computed deterministically, so it’s reproducible even if the AI step fails (the UI then shows facts only plus a warning).

## Assumptions
* Documents are text-bearing (digital PDFs, TXT, MD, CSV). Fields look like labelled values; the LLM generalises beyond that, the mock only handles `Label: value` lines.
* One analysis = one request; results are persisted and can be re-opened from History.
* Single-user demo; no authentication.

## Completed functionality
Multi-file upload (drag/drop) · PDF/TXT/MD/CSV · prompt + example prompts · independent per-document analysis then collective comparison · comparison table, summary, discrepancies, missing-information report, key-value extraction · per-finding source chips with verbatim quote, page/line, verified flag · copy as Markdown / JSON / table · graceful per-file failures (unsupported, corrupt, binary, empty, scanned, oversized) · history · tests · Zod validation of every model response.

## Known limitations
* **No OCR**: images and scanned PDFs are rejected with a clear message (seam: add an OCR extractor in `pipeline/extract.ts`).
* The mock provider is heuristic (string-level) and exists to run the app offline; semantic quality needs a real model.
* Very large corpora: per-doc cap of 200k chars (truncation is reported); stage 4 sends all facts in one call, so hundreds of documents would need hierarchical reduction.
* Analysis runs synchronously inside the HTTP request (fine for a demo, long for big uploads).
* `npm run build` only typechecks; the server runs through `tsx`.
* Value normalisation (`Ltd`/`Limited`, `St`/`Street`, currency formats) is a small hand-written rule set.
* Table “Copy table” copies the Markdown section; no CSV export.

## Security considerations
* Uploads are held in memory only (never written to disk → no path traversal or leftover files); filenames sanitised.
* Allow-listed extensions **and** content sniffing (PDF magic, NUL bytes, UTF-8 validity); client MIME is ignored. Size/count/field limits; PDF parsing under a timeout.
* Prompt-injection hygiene: documents are wrapped in tags and declared untrusted data; model output is schema-validated and cannot do anything except fill the schema; citations to unknown documents are dropped.
* `helmet`, CORS pinned to the client origin, rate limiting, parameterised SQL, internal errors never leaked to clients, API key only in server env.
* Not covered: auth, virus scanning, encryption at rest, PII redaction before sending text to an external LLM.

## Productionising
Auth + per-tenant isolation · object storage + virus scanning · job queue (analysis as async job with progress/SSE) · Postgres + migrations · OCR service (Textract/Tesseract) for scans · hierarchical map-reduce for large corpora and embedding retrieval for very long documents · prompt/response caching and token budgets · observability (structured logs, tracing, LLM cost metrics) · eval set of documents with known discrepancies in CI · Docker image + CI/CD · PII redaction and data-retention policy.

## AI tool disclosure and personal decisions
* **Tools used:** Claude Code (Claude Sonnet 5.5) generated most of the code from the brief in this session.
* **Decisions to be confirmed/owned by the candidate** (edit before submitting): facts-first pipeline with server-verified quotes; deterministic comparison separate from AI interpretation; in-memory uploads; SQLite for zero-setup; mock provider so the app is verifiable without a key; no OCR in the time box.
