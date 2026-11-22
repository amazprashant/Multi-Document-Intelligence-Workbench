import { useEffect, useState } from "react";
import { LIMITS, type AnalysisResult } from "@workbench/shared";
import { getAnalysis, getConfig, listHistory, runAnalysis, type HistoryItem } from "./api";
import { ResultView } from "./components/ResultView";
import { UploadPanel, type Picked } from "./components/UploadPanel";

const EXAMPLES = [
  "Compare the information across all uploaded documents.",
  "Identify inconsistencies between the application form and supporting documents.",
  "Extract key dates, obligations, financial values, and missing information.",
  "Compare the financial position of the companies represented in the documents.",
  "Highlight discrepancies in names, addresses, licence details, or revenue figures.",
];

export function App() {
  const [picked, setPicked] = useState<Picked[]>([]);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [provider, setProvider] = useState("");

  const refresh = () => listHistory().then(setHistory).catch(() => undefined);
  useEffect(() => { refresh(); getConfig().then((c) => setProvider(c.provider)).catch(() => setProvider("server unreachable")); }, []);

  const valid = picked.filter((p) => !p.error);
  const canRun = !busy && valid.length > 0 && instruction.trim().length > 0 && instruction.length <= LIMITS.maxInstructionChars;

  const run = async () => {
    setBusy(true); setError(null);
    try { setResult(await runAnalysis(valid.map((p) => p.file), instruction.trim())); refresh(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="app">
      <header className="top">
        <h1>Multi-Document Intelligence Workbench</h1>
        <small>AI provider: {provider || "…"}</small>
      </header>
      <main>
        <div className="panel">
          <UploadPanel picked={picked} onChange={setPicked} />
          <label htmlFor="instr">Analysis instruction</label>
          <textarea id="instr" rows={3} value={instruction} maxLength={LIMITS.maxInstructionChars}
            placeholder="e.g. Identify inconsistencies between the application form and supporting documents."
            onChange={(e) => setInstruction(e.target.value)} />
          <div className="examples">{EXAMPLES.map((x) => <button key={x} type="button" className="ex" onClick={() => setInstruction(x)}>{x}</button>)}</div>
          <button type="button" className="primary" disabled={!canRun} onClick={run}>{busy ? "Analysing…" : "Analyse documents"}</button>
          {picked.some((p) => p.error) && <p className="err">Files with errors are excluded from the analysis.</p>}
          {error && <p className="err" role="alert">{error}</p>}
          {history.length > 0 && (
            <details><summary>History ({history.length})</summary>
              <ul className="history">{history.map((h) => (
                <li key={h.id}><button type="button" onClick={() => getAnalysis(h.id).then(setResult).catch((e) => setError(e.message))}>
                  {h.instruction.slice(0, 60)} <small>· {h.documentCount} docs · {new Date(h.createdAt).toLocaleString()}</small></button></li>))}</ul>
            </details>
          )}
        </div>
        {result ? <ResultView r={result} /> : <section className="empty"><p>Upload two or more documents, write an instruction, and results with per-finding sources will appear here.</p></section>}
      </main>
    </div>
  );
}
