# ADR 0003 – Uploads kept in memory

Status: accepted

## Context
Uploaded files are untrusted; writing them to disk adds path-traversal, cleanup and permission risks.

## Decision
multer `memoryStorage` with size/count limits; filenames sanitised before storage; only extracted text is persisted.

## Consequences
No leftover files. Memory use is bounded by 8×10 MB per request. Original bytes are not retained (hash is stored for identity).
