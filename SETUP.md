# SETUP

## Requirements
- Node.js ≥ 20 (developed on 22) and npm ≥ 10
- A C/C++ toolchain is **not** normally needed (`better-sqlite3` ships prebuilt binaries). If install falls back to compiling you need `python3`, `make`, `g++`.
- No Docker, Postgres or API key required.

## Steps
```bash
git clone <repo-url> && cd "Multi-Document Intelligence Workbench"
npm install                 # installs client, server and shared workspaces
cp .env.example .env        # optional; defaults work
npm run seed                # optional: loads a demo analysis into the DB
npm run dev                 # server :3001 + client :5173
```
Open http://localhost:5173.

## Using a real model
Put `ANTHROPIC_API_KEY=sk-ant-…` in `.env` (provider switches to `anthropic`). Optional: `ANTHROPIC_MODEL`. Sending documents to a third party means **do not use real customer data**.

## Commands
| Command | What it does |
|---|---|
| `npm run dev` | Server (tsx watch) and client (Vite) together |
| `npm test` | Vitest suite (server + pipeline + HTTP) |
| `npm run typecheck` | `tsc --noEmit` for server and client |
| `npm run build` | Typecheck server, build client to `client/dist` |
| `npm run seed` | Run the pipeline on `samples/licence-application` and store the result |
| `npm run samples` | Regenerate `bank_statement_summary.pdf` |

## Troubleshooting
| Symptom | Fix |
|---|---|
| UI shows "server unreachable" | Server not running or port 3001 busy: set `PORT` in `.env` **and** the Vite proxy target in `client/vite.config.ts`. |
| `better-sqlite3` install/compile error | Use Node 20/22 LTS; delete `node_modules`, run `npm install` again; install build tools if it must compile. |
| `EADDRINUSE` | Another process uses 3001/5173: `lsof -i :3001` and stop it, or change ports. |
| CORS error in browser | `CLIENT_ORIGIN` must equal the UI origin (default `http://localhost:5173`). |
| Every PDF "could not be read" | It may be scanned/encrypted/corrupt. Try the sample PDF. |
| "Unsupported: PNG images need OCR" | Expected: OCR is out of scope. |
| `hex string` warnings in terminal | Harmless pdf.js noise from some PDFs. |
| Reset data | Stop the server, delete `server/data/workbench.db*`, restart. |
| Using the Anthropic provider fails | Check key, network, and model name; failures appear as warnings, facts from other steps are kept. |
