# Beginner's Guide to the Multi-Document Intelligence Workbench

This guide explains the whole project in plain language. No prior knowledge is assumed.

---

## 1. What does this app do?

Imagine you work at a bank and have four papers about one company: an application form, a licence certificate, a bank statement and a financial summary. You want to know: **"Do they all agree with each other?"**

Doing this by hand is slow. This app does it for you:

1. You **upload** the documents.
2. You **type a question** (called an "instruction"), e.g. *"Find inconsistencies between the documents."*
3. The app **reads** every document, pulls out the important facts, **compares** them, and shows the results.
4. Every result says **which document it came from**, so you can check it yourself.

Example finding: *"Licence Number differs: application_form.txt says ML-2024-00417, licence_certificate.txt says ML-2024-00471."*

---

## 2. The big picture

The app has two halves that talk to each other:

```
 YOUR BROWSER                         YOUR COMPUTER (server)
┌───────────────┐   sends files +    ┌────────────────────────┐
│  Frontend     │   instruction      │  Backend               │
│  (React)      │ ─────────────────▶ │  (Node.js + Express)   │
│  what you see │ ◀───────────────── │  reads, analyses, saves│
└───────────────┘   sends results    └───────────┬────────────┘
                                                 │
                                          ┌──────▼──────┐
                                          │  Database   │
                                          │  (SQLite)   │
                                          └─────────────┘
```

- **Frontend** = the web page (buttons, upload box, tables). Lives in `client/`.
- **Backend** = the program that does the real work. Lives in `server/`.
- **Database** = a file that remembers past analyses. Lives in `server/data/` (created when you first run it).
- **Shared** = code both halves use, so they agree on the shape of the data. Lives in `shared/`.

**TypeScript** is used everywhere. It is JavaScript with *types* (labels saying "this is a number", "this is text"), which catches many mistakes before the program runs.

---

## 3. What happens when you click "Analyse documents"?

Follow one request from start to finish:

### Step 1 – Upload and validate (`server/src/pipeline/validate.ts`)
The server first asks, "Is this file safe and supported?"
- Only `.pdf`, `.txt`, `.md`, `.csv` are allowed.
- It looks **inside** the file, not only at the name. A virus renamed `report.pdf` is caught because real PDFs start with `%PDF-`.
- Images, empty files, binary files and oversized files are rejected **with a reason**. Other files still get processed.

### Step 2 – Extract text (`extract.ts`, `csv.ts`)
- PDF → text, page by page (library `pdf-parse`).
- TXT/MD → used as is.
- CSV → converted into lines like `Annual Revenue 2023: $4,650,000` so it reads like the other documents.

### Step 3 – Chunk (`chunk.ts`)
A very long document can't be sent to an AI in one go. So it's cut into pieces (~8,000 characters each, slightly overlapping so nothing is lost at the cut). This is the "sensible handling of large content" requirement.

### Step 4 – Extract facts, one document at a time
Each chunk is given to the **LLM provider** (see section 4) which returns **facts**:

```
field: "Licence Number"   value: "ML-2024-00417"   quote: "Licence Number: ML-2024-00417"
```

Documents are analysed **separately**, never mashed into one big blob. That is how we keep track of which document said what.

### Step 5 – Check the quotes (`provenance.ts`)
The AI might invent things. So the server searches for each `quote` inside the original document text.
- Found → marked **verified**, and we record the page (PDF) or line number.
- Not found → marked **⚠ unverified** in the UI.

This is called **provenance** — proof of where information came from.

### Step 6 – Compare (`compare.ts`)
Plain code (no AI) groups facts with the same field name (e.g. "Licence Number") across documents and checks whether the values match. It knows "Ltd" = "Limited" and "$4,200,000" = "4200000". Result: the **comparison table**.

### Step 7 – Interpret
The AI is now given only the **extracted facts** (not the raw documents) and asked for:
- a summary,
- a list of discrepancies (with severity),
- missing information.

Every item must cite quotes, and the server re-verifies them.

### Step 8 – Save and return
Everything is saved in the database and sent back to the browser, which draws the tabs.

---

## 4. The "AI" part, and why there's a mock

There is a shared interface called `LlmProvider` (`server/src/types.ts`) with two jobs: *extract facts* and *interpret*. Two things implement it:

| Provider | File | When used |
|---|---|---|
| **Anthropic (Claude)** | `server/src/llm/anthropic.ts` | If you set `ANTHROPIC_API_KEY` in `.env` |
| **Mock** | `server/src/llm/mock.ts` | Default; works offline, no key, no cost |

The mock is *not* intelligent. It just finds lines shaped like `Label: value` and compares text. It lets you run and test the whole app without paying for an AI. The brief explicitly allows "any LLM provider or mocked AI implementation".

The real Claude provider uses **structured output**: it is forced to answer in a fixed JSON shape, and the server checks that shape with **Zod** (a validation library). If the AI replies in the wrong shape, it's rejected rather than silently trusted.

**Prompt injection:** a document could contain text like "ignore previous instructions". The prompts therefore tell the model that document content is *data*, never commands.

---

## 5. Facts vs. interpretation (very important)

The brief asks for a "clear distinction between extracted facts and AI-generated interpretation". In the UI:

- 🟢 **Extracted fact** — copied from a document, with a quote. Trustworthy, checkable.
- 🟣 **AI interpretation** — a judgement ("this looks inconsistent", "this is probably missing"). Useful, but should be verified.

---

## 6. What you see in the UI (`client/src/`)

| Tab | Meaning |
|---|---|
| Summary | Short overview (AI interpretation) |
| Comparison | Table: one row per field, one column per document; mismatches highlighted red |
| Discrepancies | Cards with severity (high/medium/low) and evidence |
| Missing info | Fields present in some documents but absent from others |
| Key-values | Every extracted fact with its source |

Small **📄 chips** next to each value show the document name and page/line. Click one to reveal the exact quote.

Buttons: **Copy all (Markdown)**, **Copy JSON**, **Copy table**. **History** reopens past analyses.

---

## 7. The database (`server/src/db/schema.sql`)

Three tables (think of them as spreadsheets):

- `analyses` — one row per run: the instruction, time, and full result.
- `documents` — one row per uploaded file: name, size, status, extracted text.
- `facts` — one row per extracted fact: field, value, quote, location, verified?

SQLite is used because it is a single file: no installation needed.

---

## 8. Security, in simple terms

| Risk | What the project does |
|---|---|
| Malicious files | Check content, not just name; allow-list of types |
| Huge uploads | Max 8 files, 10 MB each |
| Files left on server | Uploads are kept in memory only, never saved to disk |
| Weird filenames (`../../etc/passwd`) | Filenames are cleaned |
| Too many requests | Rate limiting |
| Leaking errors | Server logs details; users see a generic message |
| Secret API key | Stays on the server in `.env`, never sent to the browser |
| AI tricked by documents | Documents treated as data; output schema-checked |

---

## 9. Folder map

```
Multi-Document Intelligence Workbench/
├── client/                  ← the web page (React)
│   └── src/
│       ├── App.tsx          ← main screen: upload + instruction + results
│       ├── api.ts           ← talks to the backend
│       └── components/      ← UploadPanel, ResultView, Evidence chips
├── server/                  ← the backend (Node)
│   ├── src/
│   │   ├── index.ts         ← starts the server
│   │   ├── app.ts           ← the API routes (URLs)
│   │   ├── config.ts        ← reads settings from .env
│   │   ├── pipeline/        ← the steps from section 3
│   │   ├── llm/             ← Claude + mock
│   │   └── db/              ← schema.sql, saving/loading, seed
│   ├── tests/               ← automated tests
│   └── scripts/             ← makes the sample PDF
├── shared/src/index.ts      ← data shapes + "Copy as Markdown" function
├── samples/                 ← fake documents to try
├── docs/                    ← this guide
├── .env.example             ← list of settings
└── README.md                ← technical summary
```

The API has these URLs: `POST /api/analyses` (run), `GET /api/analyses` (history), `GET /api/analyses/:id` (open one), `GET /api/health`.

---

## 10. How to run it

```bash
npm install        # download libraries (once)
npm run dev        # start backend + frontend
```
Open http://localhost:5173, upload files from `samples/licence-application/`, type an instruction, click **Analyse documents**.

Other commands: `npm test` (run tests), `npm run typecheck` (check types), `npm run seed` (pre-load a demo analysis).

---

## 11. Glossary

- **API** – a set of URLs the frontend calls to ask the backend to do things.
- **Chunk** – a piece of a long document.
- **LLM** – Large Language Model (e.g. Claude).
- **Provenance** – proof of where a piece of information came from.
- **Schema** – the agreed shape/rules for data.
- **Zod** – library that checks data matches a schema.
- **OCR** – turning pictures of text into text (not supported here).
- **Mock** – a fake stand-in used for testing.
- **Monorepo** – several projects (client, server, shared) in one repository.

---

## 12. What's missing (known limitations)

- No OCR → scanned PDFs and images are refused.
- The mock is basic; real insight needs an API key.
- No login system.
- Analysis runs while the browser waits (fine for demos, not for huge uploads).
- Very many documents would need a smarter, multi-level summarising approach.

The README lists how each would be solved in a real product.

---

## 13. Explaining it in an interview (30-second version)

> "It's a React and Node/TypeScript app. Uploaded documents are validated, text is extracted, split into chunks, and each document is analysed separately by an LLM that returns structured facts with verbatim quotes. The server verifies every quote against the source to preserve provenance, builds the comparison deterministically, and only then asks the AI to interpret the facts. The UI clearly separates extracted facts from AI interpretation, and every finding links back to its source document."

Questions you may be asked, and where to look:
- *Why not send all documents in one prompt?* → Provenance and size limits (steps 3–5).
- *How do you stop hallucinations?* → Quote verification + deterministic comparison.
- *How is it secure?* → Section 8.
- *How would you scale it?* → README "Productionising".

---

## 14. Suggested learning order

1. Run the app and click around.
2. Read `shared/src/index.ts` (the data shapes).
3. Read `server/src/pipeline/analyze.ts` (the main flow; everything else is called from here).
4. Read `server/tests/pipeline.test.ts` (shows what the code is expected to do).
5. Skim `client/src/components/ResultView.tsx`.
