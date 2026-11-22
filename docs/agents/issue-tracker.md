# Issue tracker conventions
- Work items live as GitHub issues (or, offline, as files under `.scratch/<feature>/`).
- Title: imperative, <70 chars ("Flag unverified quotes in Markdown export").
- Body: **Context**, **Acceptance criteria** (checklist), **Out of scope**, links to ADRs.
- One issue = one reviewable change. Reference the issue number in the commit message.
- Specs for larger features go in `.scratch/<feature>/spec.md`; the issue links to it.
