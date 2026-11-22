# ADR 0005 – Deterministic comparison separate from interpretation

Status: accepted

## Context
Equality of values should be reproducible and cheap; judgement needs a model.

## Decision
Rows are built by grouping normalised fields and comparing normalised values in code. The model receives only facts and rows and produces summary, discrepancies, missing info.

## Consequences
Table is stable and testable and survives model outages. Normalisation rules are hand-written and incomplete; the model can add semantic judgement on top.
