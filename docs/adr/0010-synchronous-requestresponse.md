# ADR 0010 – Synchronous request/response

Status: accepted

## Context
Time-boxed build; results are needed immediately by the UI.

## Decision
`POST /api/analyses` runs the whole pipeline and returns the result. Persistence is one transaction at the end.

## Consequences
Simple and easy to test. Long uploads hold a connection and can time out; PRODUCTION.md moves this to a queue with streamed stage progress.
