# MYPROCESS – how this was built

> Fill the bracketed fields yourself before submitting. They are deliberately **not** pre-filled: only the person who did the work can state them truthfully.

## Timeline
- Session length: [__ minutes] (brief: 60-minute monitored session)
- Repository created at start of session: [yes/no]
- Actual build time: [__]
- AI tooling cost: [$__]

## AI tools disclosure
| Tool | Used for |
|---|---|
| Claude Code (Claude Sonnet 5.5) | Generated the monorepo scaffold, pipeline, providers, API, React UI, tests and these docs from the brief |
| [GitHub Copilot / Codex / none] | [__] |

## Order of work (see `git log`)
1. Monorepo + shared Zod schemas
2. Document pipeline (validate → extract → chunk → provenance)
3. LLM provider abstraction (Anthropic + mock)
4. SQLite persistence, REST API, samples, tests
5. React client, README, `.env.example`
6. PDF retry fix, beginner guide, documentation set

## Decisions – confirm which were yours
Edit this list to what you actually decided/understood. Rationale is in `docs/adr/`.
- [ ] Facts-first pipeline with server-verified quotes (ADR 0004)
- [ ] Deterministic comparison separate from AI interpretation (ADR 0005)
- [ ] Provider interface + offline mock (ADR 0006)
- [ ] In-memory uploads, content sniffing (ADR 0003, 0009)
- [ ] SQLite for zero-setup (ADR 0002)
- [ ] Synchronous request for the time box (ADR 0010)

## What I verified myself
[List what you ran: `npm test`, the sample flows in QUESTIONS.md, the UI walk-through…]

## Bugs found while building
- pdf.js intermittently failed to parse the first attempt on a generated PDF ("bad XRef entry"); fixed with bounded retry in `server/src/pipeline/extract.ts`.
- The sample-PDF generator exited before the file finished writing, producing a truncated PDF; fixed by waiting for the stream `finish` event.

## What I would do with more time
OCR, async jobs with streaming progress, an eval harness for the real model, UI tests (Playwright).
