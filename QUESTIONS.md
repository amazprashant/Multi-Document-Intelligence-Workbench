# QUESTIONS – verified prompts

Results below were produced with the **mock provider** on the committed samples (`npm test` covers the first two).
Upload sets: **A** = all four files in `samples/licence-application/`; **B** = both files in `samples/company-financials/`.

## Questions that work
| # | Set | Instruction | Expected result |
|---|---|---|---|
| 1 | A | Compare the information across all uploaded documents. | 3 discrepancies: Registered Address (`14 Harbour Street` vs `41 Harbour Street`), Licence Number (`…00417` vs `…00471`), Annual Revenue 2023 (`$4,200,000` vs `$4,650,000`). Company Name is **not** flagged (`Ltd` ≡ `Limited`). Missing-info lists fields not present in every document (e.g. Director absent from the certificate). |
| 2 | A | Identify inconsistencies between the application form and supporting documents. | Same 3 discrepancies; each cites ≥2 documents with page/line (PDF cites `page 1`). |
| 3 | A | Extract key dates, obligations, financial values, and missing information. | Mock filters to date + financial facts only: issue/expiry dates, revenue, net profit, closing balance. One discrepancy: Annual Revenue 2023. |
| 4 | A | Highlight discrepancies in names, addresses, licence details, or revenue figures. | Same 3 discrepancies as #1. |
| 5 | B | Compare the financial position of the companies represented in the documents. | 4 rows (Total Revenue, Net Profit, Total Assets, Total Liabilities) flagged as differing. *Caveat:* these are different companies, so "differs" is expected; the table is the useful output. |
| 6 | B | Extract key dates | One fact per document (Financial Year End `2023-12-31`), consistent, no discrepancies. |

Click any source chip to see the exact quote; every chip for these runs is `verified`.

## Questions / inputs that are handled or refused
| Input | Result |
|---|---|
| PNG/JPEG/GIF upload | `422` – "Unsupported: PNG images need OCR, which is not enabled in this build." |
| `.pdf` that isn't a PDF (`hello` renamed) | `422` – "File has a .pdf extension but is not a valid PDF." |
| `.exe`, or any extension outside pdf/txt/md/csv | `422` – "Unsupported file type…" |
| Empty file | `422` – "File is empty." |
| Binary file named `.txt` | Rejected – "File appears to be binary, not text." |
| 9 files | `400` – "At most 8 files are allowed." |
| File over 10 MB | `413` – "A file exceeds the 10 MB limit." |
| No instruction | `400` – "Provide an analysis instruction." |
| Instruction > 2000 chars | `400` – "Instruction must be at most 2000 characters." |
| No files | `400` – "Upload at least one document." |
| One valid + one invalid file | `201`; invalid listed as failed, rest analysed; warning shown. |
| Only one readable document | `201` with warning that no comparison is possible. |
| Document containing "ignore previous instructions…" | Treated as data. (Mock ignores it; Anthropic prompt marks documents untrusted.) |

## Not supported (by design)
Scanned PDFs / images (no OCR), non-`Label: value` prose under the mock provider (use a real model), legal/financial advice.
