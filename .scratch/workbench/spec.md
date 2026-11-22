# Feature spec – Multi-Document Intelligence Workbench (v1)

## Goal
Compare multiple uploaded documents under a user instruction and present source-attributed findings.

## Acceptance criteria
- [x] Upload ≥2 formats (PDF, TXT, MD, CSV), up to 8 files × 10 MB
- [x] Instruction input with example prompts
- [x] Per-document extraction; document boundaries preserved
- [x] Outputs: comparison table, summary, discrepancies, missing info, key-values
- [x] Every finding cites document + quote + page/line; quote verified server-side
- [x] Fact vs AI interpretation visibly distinct
- [x] Copy output (Markdown, JSON, table)
- [x] Invalid/unsupported/unreadable documents handled per file
- [x] Large documents chunked/truncated with warnings
- [x] Persistence (SQLite) and history
- [x] Automated tests; README; `.env.example`; samples; schema

## Backlog
- [ ] OCR for images/scans
- [ ] Async jobs with SSE stage progress
- [ ] Anthropic provider tests with recorded responses
- [ ] Playwright UI tests
- [ ] CSV/Excel export of the comparison table
- [ ] Semantic value equivalence (dates, addresses) beyond hand-written rules
