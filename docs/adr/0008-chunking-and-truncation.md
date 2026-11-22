# ADR 0008 – Chunking and truncation

Status: accepted

## Context
Documents may be larger than a model context; analysis must stay bounded.

## Decision
Cap text at `MAX_DOC_CHARS` (200k, warned), split into ~8k-char chunks with 300 overlap on paragraph/line boundaries, process with concurrency 3. Chunks never cross documents.

## Consequences
Predictable cost and latency. Overlap can duplicate facts (de-duplicated by doc+field+value). Cross-chunk reasoning inside a document is limited.
