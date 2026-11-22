import { useState } from "react";
import { resultToMarkdown, type AnalysisResult } from "@workbench/shared";
import { AiBadge, FactBadge, SourceChip } from "./Evidence";

type Tab = "summary" | "table" | "discrepancies" | "missing" | "kv";

export function ResultView({ r }: { r: AnalysisResult }) {
  const [tab, setTab] = useState<Tab>("summary");
  const [copied, setCopied] = useState<string | null>(null);
  const docs = r.documents.filter((d) => d.status === "processed");

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); }
    catch { setCopied("Copy failed – select the text manually"); }
    setTimeout(() => setCopied(null), 2000);
  };
  const tabs: [Tab, string][] = [
    ["summary", "Summary"], ["table", `Comparison (${r.comparison.rows.length})`], ["discrepancies", `Discrepancies (${r.discrepancies.length})`],
    ["missing", `Missing info (${r.missingInformation.length})`], ["kv", `Key-values (${r.keyValues.length})`],
  ];

  return (
    <section className="results" aria-label="Results">
      <div className="results-head">
        <h2>Results</h2>
        <div>
          <button type="button" onClick={() => copy(resultToMarkdown(r), "Copied as Markdown")}>Copy all (Markdown)</button>
          <button type="button" onClick={() => copy(JSON.stringify(r, null, 2), "Copied as JSON")}>Copy JSON</button>
          <span role="status" className="copied">{copied}</span>
        </div>
      </div>
      <p className="meta">“{r.instruction}” · {r.provider}</p>

      {r.warnings.length > 0 && (
        <div className="warnings" role="alert"><strong>Warnings</strong><ul>{r.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>
      )}
      <ul className="docs">
        {r.documents.map((d) => (
          <li key={d.id} className={d.status === "failed" ? "doc-failed" : ""}>
            <strong>{d.name}</strong>
            {d.status === "failed" ? <span className="err"> ✕ {d.error}</span>
              : <small> {d.pageCount ? `${d.pageCount} pages · ` : ""}{d.charCount.toLocaleString()} chars · {d.chunkCount} chunk(s) · {d.factCount} facts{d.truncated ? " · truncated" : ""}</small>}
          </li>
        ))}
      </ul>

      <div className="tabs" role="tablist">
        {tabs.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>{label}</button>)}
      </div>

      {tab === "summary" && (
        <div><AiBadge /><p className="summary">{r.summary.text}</p>
          <div className="sources">{r.summary.citations.map((e, i) => <SourceChip key={i} e={e} />)}</div></div>
      )}

      {tab === "table" && (r.comparison.rows.length === 0 ? <p>No comparable fields were extracted.</p> : (
        <div className="scroll">
          <FactBadge />
          <table>
            <thead><tr><th>Field</th>{docs.map((d) => <th key={d.id}>{d.name}</th>)}<th>Consistent</th></tr></thead>
            <tbody>
              {r.comparison.rows.map((row, i) => (
                <tr key={i} className={row.consistent ? "" : "row-bad"}>
                  <th scope="row">{row.field}</th>
                  {docs.map((d) => {
                    const c = row.cells[d.id];
                    return <td key={d.id}>{c ? <><div>{c.value}</div><SourceChip e={c.evidence} /></> : <span className="none">—</span>}</td>;
                  })}
                  <td>{row.consistent ? "✓" : "✗"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => copy(resultToMarkdown(r).split("## Discrepancies")[0]!.split("## Comparison table (extracted facts)")[1] ?? "", "Table copied")}>Copy table</button>
        </div>
      ))}

      {tab === "discrepancies" && (r.discrepancies.length === 0 ? <p>No discrepancies found.</p> : (
        <ul className="cards">{r.discrepancies.map((d, i) => (
          <li key={i} className={`card sev-${d.severity}`}>
            <header><span className={`sev sev-${d.severity}`}>{d.severity}</span> <strong>{d.title}</strong> <AiBadge /></header>
            <p>{d.explanation}</p>
            <div className="sources">{d.evidence.map((e, j) => <SourceChip key={j} e={e} />)}</div>
          </li>))}</ul>
      ))}

      {tab === "missing" && (r.missingInformation.length === 0 ? <p>No missing information found.</p> : (
        <ul className="cards">{r.missingInformation.map((m, i) => (
          <li key={i} className="card">
            <header><strong>{m.item}</strong> <AiBadge /></header>
            <p>{m.explanation}</p>
            <p><small>Missing from: {m.missingFrom.map((x) => x.documentName).join(", ")}</small></p>
            <div className="sources">{m.presentIn.map((e, j) => <SourceChip key={j} e={e} />)}</div>
          </li>))}</ul>
      ))}

      {tab === "kv" && (
        <div className="scroll"><FactBadge />
          <table><thead><tr><th>Field</th><th>Value</th><th>Source</th></tr></thead>
            <tbody>{r.keyValues.map((f, i) => <tr key={i}><th scope="row">{f.field}</th><td>{f.value}</td><td><SourceChip e={f.evidence} /></td></tr>)}</tbody></table></div>
      )}
    </section>
  );
}
