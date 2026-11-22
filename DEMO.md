# DEMO – six-minute walkthrough

Prep: `npm install && npm run dev`, open http://localhost:5173, have `samples/licence-application/` open in a file manager.

| Time | Do | Say |
|---|---|---|
| 0:00 | Show the empty UI and the provider label. | "Upload several documents, give an instruction, get a comparison where every finding is traceable. No API key needed – there's an offline mock." |
| 0:30 | Drag all 4 files from `licence-application/`. Add a `.png` too. | "Four fictional documents: form, certificate, CSV, PDF. The image is rejected in the client list already." |
| 1:15 | Click the example *"Highlight discrepancies in names, addresses, licence details, or revenue figures."* → **Analyse**. | "Each document is read independently, chunked, and facts are extracted with verbatim quotes." |
| 2:00 | Show the document list under Results (pages, chars, chunks, facts). | "Boundaries are preserved: counts are per document." |
| 2:30 | **Discrepancies** tab: Licence Number, Address, Revenue. Click a chip. | "Quote shown, page/line recorded, and the server verified it exists in that document." |
| 3:15 | Point at *Company Name* in **Comparison** being ✓. | "`Ltd` vs `Limited` is normalised – not a false alarm. This table is plain code, not AI." |
| 3:45 | Point at the green *Extracted fact* vs purple *AI interpretation* badges. | "Facts are checkable; interpretation is labelled as judgement." |
| 4:15 | **Missing info** tab, then **Key-values**. | "Fields present in some documents but not others, plus raw key-value extraction." |
| 4:45 | **Copy all (Markdown)**, paste into an editor. | "Copyable, keeps citations and the fact/AI split." |
| 5:15 | Upload only `evil.exe` (create any file) → error; then History → reopen a past run. | "Invalid input fails per file with a reason; everything is persisted in SQLite." |
| 5:45 | Show `README.md` limitations; mention OCR & job queue as next steps. | "Honest limits and a production path are documented." |

Fallback if the UI misbehaves: run the commands in `SETUP.md` or `curl` example in `README.md`.
