# ADR 0001 – Monorepo with npm workspaces

Status: accepted

## Context
Client and server must agree on request/response shapes; the brief wants clear frontend/backend separation.

## Decision
One repo with `client/`, `server/`, `shared/` as npm workspaces. `shared` exports Zod schemas, types, normalisers and the Markdown exporter and is imported as TypeScript source.

## Consequences
Single install, one source of truth for types, no publish step. Cost: `shared` is not compiled, so the server runs through `tsx` rather than a built `dist`.
