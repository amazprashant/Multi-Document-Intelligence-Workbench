# Domain notes for agents
- Domain: compliance/finance document review – licence applications, certificates, bank statements, annual reports.
- Typical discrepancies: company name variants, address transposition (14 vs 41), licence number typos, revenue mismatches between form and statement, missing registration numbers, expired dates.
- Names like `Ltd`/`Limited`, `St`/`Street`, and `$4.2M`/`4,200,000` are **equivalent** – do not flag them.
- Different companies legitimately have different financials; "differs" ≠ "wrong" in comparison mode.
- Severity guidance: **high** = identity/licence/money fields; **medium** = other mismatches; **low** = formatting/cosmetic.
- All sample data is fictional; keep it that way. Terms: see `CONTEXT.md`.
