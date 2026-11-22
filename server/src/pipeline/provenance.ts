import type { Evidence } from "@workbench/shared";
import type { SourceDocument } from "../types.js";

/** Collapse whitespace/case while remembering original offsets so we can locate quotes reliably. */
function collapse(text: string): { s: string; map: number[] } {
  let s = "";
  const map: number[] = [];
  let prevSpace = true;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (/\s/.test(c)) {
      if (!prevSpace) { s += " "; map.push(i); prevSpace = true; }
    } else { s += c.toLowerCase(); map.push(i); prevSpace = false; }
  }
  return { s: s.trimEnd(), map };
}

export function locate(doc: SourceDocument, quote: string): { found: boolean; location?: string } {
  const q = collapse(quote).s;
  if (!q) return { found: false };
  const { s, map } = collapse(doc.text);
  const idx = s.indexOf(q);
  if (idx < 0) return { found: false };
  const pos = map[idx] ?? 0;
  if (doc.pageStarts && doc.pageStarts.length) {
    let page = 1;
    doc.pageStarts.forEach((st, i) => { if (pos >= st) page = i + 1; });
    return { found: true, location: `page ${page}` };
  }
  const line = doc.text.slice(0, pos).split("\n").length;
  return { found: true, location: `line ${line}` };
}

/** Build Evidence whose `verified` flag means: the quote really appears in that document's extracted text. */
export function buildEvidence(doc: SourceDocument, quote: string): Evidence {
  const r = locate(doc, quote);
  return { documentId: doc.id, documentName: doc.name, quote: quote.trim().slice(0, 400), location: r.location, verified: r.found };
}
