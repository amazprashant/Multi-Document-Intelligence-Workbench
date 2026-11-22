# ADR 0009 – Content-sniffing validation and per-file failure isolation

Status: accepted

## Context
Client MIME types and extensions are spoofable; one bad file shouldn't ruin a batch.

## Decision
Extension allow-list plus magic-byte/UTF-8/NUL checks; PDF parsing under timeout with bounded retry. Failures become `status: failed` with a user-facing reason; only when none succeed does the API return 422.

## Consequences
Clear UX and safer parsing. Images/scans are rejected until OCR exists.
