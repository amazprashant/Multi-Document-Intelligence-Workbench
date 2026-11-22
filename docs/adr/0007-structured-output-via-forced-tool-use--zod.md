# ADR 0007 – Structured output via forced tool use + Zod

Status: accepted

## Context
Free-text model output can't be rendered reliably or trusted.

## Decision
Anthropic provider forces a single tool call whose JSON schema matches our types, then parses with Zod. Documents are wrapped in tags and declared untrusted data.

## Consequences
Malformed output fails fast and becomes a warning. Tool schemas are duplicated (JSON schema + Zod) and must be kept in sync.
