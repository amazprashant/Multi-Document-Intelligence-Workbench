# AGENTS.md – instructions for coding agents

## Project
Multi-Document Intelligence Workbench: React + Node + TypeScript monorepo (`client/`, `server/`, `shared/`). Read `README.md`, `CONTEXT.md` (terms) and `ARCHITECTURE.md` first.

## Commands
- `npm install`, `npm run dev`, `npm test`, `npm run typecheck` (run the last two before finishing any change).
- No API key is needed; the mock provider is the default.

## Rules
1. **Keep document boundaries.** Never concatenate documents into one prompt. Every fact/finding must carry `Evidence` with a document id.
2. **Facts vs interpretation.** Extracted facts need a verbatim quote verified by the server; AI judgement is always labelled as interpretation.
3. **Shared types live in `shared/`** (Zod). Don't redefine API shapes in client or server.
4. **Validate inputs** by content, not by client MIME. Failures are per document, never crash the request.
5. **No real data.** Only synthetic documents in `samples/`.
6. **Never log or return document text, API keys or stack traces to clients.**
7. New behaviour needs a test in `server/tests/`. Use `MockProvider`; no network in tests.
8. Record significant decisions as an ADR in `docs/adr/` (next number, short).
9. Small commits with clear messages.

## Conventions pointers
- Issue tracking: `docs/agents/issue-tracker.md`
- Triage labels: `docs/agents/triage-labels.md`
- Domain notes: `docs/agents/domain.md`
- Feature spec: `.scratch/workbench/spec.md`
- Project init notes: `docs/init.md`
