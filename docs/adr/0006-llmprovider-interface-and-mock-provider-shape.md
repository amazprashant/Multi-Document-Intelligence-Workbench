# ADR 0006 – LlmProvider interface and mock provider shape

Status: accepted

## Context
Need to run and test without keys, yet support a real model.

## Decision
Interface `extractFacts(chunk)` and `interpret(facts, rows)`. `AnthropicProvider` and `MockProvider` implement it. The mock is explicitly heuristic: `Label: value` lines, keyword-filtered by instruction category, string-level comparison.

## Consequences
Full pipeline is testable offline. The mock will under-perform on prose; its summary says it is a mock. New providers need only the two methods.
