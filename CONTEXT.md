# CONTEXT – Project glossary

Shared vocabulary. Code, UI and docs use these words consistently.

| Term | Meaning | Where it lives |
|---|---|---|
| **Document** | One uploaded file. Has a status: `processed` or `failed` (with a reason). | `SourceDocument` in `server/src/types.ts`, `DocumentInfo` in `shared` |
| **Instruction** | The user's free-text analysis request (max 2,000 chars). | request field `instruction` |
| **Analysis** | One run: N documents + 1 instruction → one structured result. Persisted and re-openable from History. | `AnalysisResult`, table `analyses` |
| **Extraction** | Turning a file's bytes into plain text (PDF/TXT/MD/CSV). | `pipeline/extract.ts` |
| **Chunk** | A bounded slice (~8k chars, overlapping) of one document's text sent to the model. Never spans two documents. | `pipeline/chunk.ts` |
| **Fact** | A `field` + `value` + verbatim `quote` lifted from one document. The only thing the comparison trusts. | `Fact` in `shared` |
| **Evidence** | Pointer to a source: document id/name, quote, page or line, and `verified`. | `Evidence` in `shared` |
| **Verified** | The server found the quote in that document's extracted text. `false` shows ⚠ in the UI. | `pipeline/provenance.ts` |
| **Provenance** | The ability to trace any finding back to a document and location. | whole pipeline |
| **Comparison row** | Facts with the same normalised field, one cell per document, plus `consistent`. Computed without AI. | `pipeline/compare.ts` |
| **Discrepancy** | AI-interpreted mismatch with severity and cited evidence. | `Discrepancy` |
| **Missing information** | A field present in some documents but absent from others. | `MissingItem` |
| **Interpretation** | Anything the AI concluded (summary, discrepancies, missing info). Always labelled "AI interpretation". | UI badge |
| **Provider** | An implementation of `LlmProvider`: `anthropic` or `mock`. | `server/src/llm/` |
| **Mock provider** | Offline heuristic stand-in; reads `Label: value` lines. | `llm/mock.ts` |
| **Normalisation** | Making values comparable: case, punctuation, `Ltd`/`Limited`, `$4,200,000`/`4200000`. | `normaliseField/normaliseValue` in `shared` |
| **Warning** | Non-fatal problem surfaced to the user (failed file, truncation, unverified quote). | `AnalysisResult.warnings` |
| **Synthetic document** | Fictional sample data in `samples/`. No real customer data is ever used. | `samples/` |

## Words we avoid
- "Answer" – we return *findings*, not a single answer.
- "Source of truth" for AI output – the document text is the source of truth; AI output is only trusted when its quote verifies.
