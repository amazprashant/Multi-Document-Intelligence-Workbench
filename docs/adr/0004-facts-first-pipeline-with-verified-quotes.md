# ADR 0004 – Facts-first pipeline with verified quotes

Status: accepted

## Context
The brief forbids merging documents into one prompt and requires traceable findings.

## Decision
Extract per document and per chunk into `{field,value,quote}`. The server locates each quote in the document text (whitespace/case-insensitive) and records page or line. Unfound quotes are kept but flagged `verified=false`.

## Consequences
Hallucinated provenance becomes visible. Extra latency from many small calls. Quote matching is textual, so paraphrases are flagged.
