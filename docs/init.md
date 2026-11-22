# Project init notes

## Origin
Built from a 60-minute technical-screening brief: *Multi-Document Intelligence Workbench* – upload several documents, give an instruction, receive a structured, source-attributed comparison. Mandatory: React, Node.js, TypeScript (both sides), a relational DB, a document-processing library, any LLM or a mock.

## Brief → where it's implemented
| Requirement | Implementation |
|---|---|
| Multiple uploads, ≥2 formats | `UploadPanel`, multer; PDF/TXT/MD/CSV |
| Extract content | `pipeline/extract.ts`, `csv.ts` |
| User prompt | instruction field + examples |
| Independent + collective analysis | per-document extraction, then comparison/interpretation |
| Output forms | table, summary, discrepancies, missing-info, key-values |
| Document support per finding | `Evidence` chips with quote + page/line |
| Copy output | Markdown / JSON / table buttons |
| Bad documents handled | `validate.ts`, per-file `failed` status |
| Synthetic data only | `samples/` |
| Tests, README, .env.example, schema, commit history | `server/tests`, `README.md`, `.env.example`, `db/schema.sql`, git log |

## First-time bootstrap (already done)
npm workspaces → shared Zod schemas → pipeline → providers → DB/API → client → docs.
