# PRODUCTION – taking this beyond a demo

## Gaps today → remedy
| Area | Today | Production |
|---|---|---|
| Auth & tenancy | none | OIDC/SSO, per-tenant data isolation, RBAC, audit log of who analysed what |
| Storage | uploads in memory; text in SQLite | Object storage (encrypted, lifecycle rules) + Postgres with migrations (Drizzle/Prisma); retention & deletion policy |
| Execution | synchronous HTTP request | Job queue (BullMQ/SQS), workers, status polling or SSE per stage, retries, idempotency |
| OCR | rejected | Textract / Azure Document Intelligence / Tesseract worker; confidence scores in `Evidence` |
| Scale of content | per-doc cap 200k chars, one interpretation call | Hierarchical map-reduce; embeddings + retrieval for long docs; batching by field |
| AI quality | mock + single model | Eval set of synthetic docs with known discrepancies run in CI; prompt versioning; model fallback; semantic equality for values |
| Security | helmet, rate limit, content sniffing | + AV scanning (ClamAV), WAF, secrets manager, PII redaction before LLM calls, DLP, vendor data-processing agreement, CSP tuning |
| Observability | console logs | Structured logs with request ids, OpenTelemetry traces, LLM token/cost metrics, alerting on failure/unverified-quote rates |
| Delivery | `tsx` run | Docker images, CI (typecheck, tests, audit), IaC, staged rollout, `/health` + readiness probes |
| Compliance | fictional data only | Data classification, encryption in transit/at rest, access reviews, regional data residency |

## Suggested order
1. Postgres + migrations, auth. 2. Queue + progress streaming. 3. OCR. 4. Eval harness. 5. Hardening/observability.
