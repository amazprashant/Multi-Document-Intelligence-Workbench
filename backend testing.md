# Backend testing

## Run
```bash
npm test                         # all server tests (Vitest)
npm test -w server -- -t "csv"   # filter by name
npm run typecheck                # types are part of the safety net
```

## What is covered (`server/tests/pipeline.test.ts`)
| Group | Checks |
|---|---|
| validation | rejects images, fake PDFs, binary, wrong extension, empty files; sanitises `../../etc/passwd` |
| chunking & CSV | chunks are bounded, cover the whole text; CSV → labelled lines |
| pipeline (mock) | planted discrepancies found (licence number, address, revenue); `Ltd`/`Limited` **not** flagged; every citation verified and named; PDF evidence carries a page |
| failure isolation | invalid files become `failed`, valid ones still analysed, warnings emitted |
| markdown export | contains both "(AI interpretation)" and "(extracted facts)" sections |
| HTTP (supertest, in-memory SQLite) | create + fetch round trip, 400 on missing input, 422 when nothing readable, 404 unknown id |

## Approach
- **Deterministic**: tests use `MockProvider` and committed synthetic samples; no network, no API key.
- **In-memory DB** (`openDb(":memory:")`) per test app – no cleanup needed.
- The same pipeline code runs in tests and production; only the provider differs.

## Not yet covered
- `AnthropicProvider` (needs a stub of the SDK or recorded responses).
- Upload size limit with real 10 MB bodies in CI, concurrency/timeouts, multi-chunk PDFs.
- Frontend tests (Vitest + Testing Library, or Playwright).

## Manual API checks
See `QUESTIONS.md` for the refusal matrix; each row was checked against the live handler.
