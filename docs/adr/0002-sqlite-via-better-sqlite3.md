# ADR 0002 – SQLite via better-sqlite3

Status: accepted

## Context
Reviewers must run the app in minutes; any relational DB is allowed.

## Decision
SQLite file DB with a plain `schema.sql`, synchronous `better-sqlite3`, WAL mode. Tests use `:memory:`.

## Consequences
Zero infrastructure and fast tests. Single-writer and not horizontally scalable; production would move to Postgres (see PRODUCTION.md). SQL is portable.
