import { normaliseField } from "@workbench/shared";
import type { InterpretInput, LlmProvider, RawFact, RawInterpretation } from "../types.js";

const DATE_RE = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/i;
const MONEY_RE = /([$£€]\s?\d|\b\d[\d,]*(?:\.\d+)?\s?(?:usd|gbp|eur|million|m)\b)/i;
const MONEY_FIELD_RE = /revenue|turnover|profit|income|loss|amount|fee|cost|price|asset|liabilit|capital|debt|equity|balance|total|premium|salary/i;
const IDENT_FIELD_RE = /name|address|licen|registration|incorporat|director|owner|email|phone|tax|company|number|id\b/i;
const OBLIG_FIELD_RE = /obligation|must|shall|covenant|term|condition|requirement|deadline|due/i;

type Category = "dates" | "financial" | "identity" | "obligations";

function categories(field: string, value: string): Set<Category> {
  const c = new Set<Category>();
  if (DATE_RE.test(value) || /date|expir|valid|issued|effective|deadline|due/i.test(field)) c.add("dates");
  if (MONEY_RE.test(value) || MONEY_FIELD_RE.test(field)) c.add("financial");
  if (IDENT_FIELD_RE.test(field)) c.add("identity");
  if (OBLIG_FIELD_RE.test(field)) c.add("obligations");
  return c;
}

/** Which categories does the instruction ask for? Empty set = no preference (keep everything). */
function wanted(instruction: string): Set<Category> {
  const i = instruction.toLowerCase(), w = new Set<Category>();
  if (/\bdates?\b|deadline|expir/.test(i)) w.add("dates");
  if (/financ|revenue|money|value|amount|profit|turnover|figure|cost/.test(i)) w.add("financial");
  if (/name|address|licen[cs]e|registration|identity|detail/.test(i)) w.add("identity");
  if (/obligation|requirement|term|condition|covenant/.test(i)) w.add("obligations");
  return w;
}

/**
 * Offline stand-in for an LLM. Not intelligent: it extracts "Label: value" lines and does string-level
 * comparison. Its purpose is to exercise the full pipeline (chunking, provenance, schema, UI) without a key.
 */
export class MockProvider implements LlmProvider {
  readonly name = "mock (offline heuristics)";
  async extractFacts({ instruction, chunk }: { instruction: string; chunk: { text: string } }): Promise<RawFact[]> {
    const keep = wanted(instruction);
    const out: RawFact[] = [];
    for (const rawLine of chunk.text.split("\n")) {
      const line = rawLine.trim().replace(/^[-*•]\s+/, "");
      const m = line.match(/^([A-Za-z][A-Za-z0-9 ()/&.'-]{1,59}?)\s*:\s*(\S.*)$/);
      if (!m) continue;
      const field = m[1]!.trim(), value = m[2]!.trim();
      if (keep.size) {
        const cats = categories(field, value);
        if (![...cats].some((c) => keep.has(c))) continue;
      }
      out.push({ field, value, quote: line });
    }
    return out;
  }

  async interpret(input: InterpretInput): Promise<RawInterpretation> {
    const discrepancies: RawInterpretation["discrepancies"] = [];
    const missing: RawInterpretation["missingInformation"] = [];
    const nameOf = new Map(input.documents.map((d) => [d.id, d.name]));
    const quoteFor = (docId: string, field: string) =>
      input.documents.find((d) => d.id === docId)?.facts.find((f) => normaliseField(f.field) === normaliseField(field))?.quote ?? "";

    for (const row of input.rows) {
      const present = Object.entries(row.values).filter(([, v]) => v !== null) as [string, string][];
      const absent = Object.entries(row.values).filter(([, v]) => v === null).map(([id]) => id);
      if (present.length >= 2 && !row.consistent) {
        const high = /name|licen|revenue|turnover|address|registration|total|amount/i.test(row.field);
        discrepancies.push({
          title: `${row.field} differs across documents`,
          severity: high ? "high" : "medium",
          field: row.field,
          explanation: `Values for "${row.field}" do not match after normalising case, punctuation and number formatting: ` +
            present.map(([id, v]) => `${nameOf.get(id)} says "${v}"`).join("; ") + ".",
          evidence: present.map(([id]) => ({ documentId: id, quote: quoteFor(id, row.field) })),
        });
      }
      if (absent.length && present.length) {
        missing.push({
          item: row.field,
          missingFromDocumentIds: absent,
          explanation: `"${row.field}" appears in ${present.length} document(s) but not in ${absent.map((a) => nameOf.get(a)).join(", ")}.`,
        });
      }
    }
    const cites = input.rows.flatMap((r) =>
      Object.entries(r.values).filter(([, v]) => v !== null).slice(0, 1).map(([id]) => ({ documentId: id, quote: quoteFor(id, r.field) })),
    ).filter((c) => c.quote).slice(0, 5);
    const consistent = input.rows.filter((r) => r.consistent).length;
    return {
      summary: {
        text: `Compared ${input.documents.length} document(s) against the instruction “${input.instruction}”. ` +
          `${input.rows.length} field(s) were extracted; ${consistent} are consistent, ${discrepancies.length} show discrepancies, ` +
          `and ${missing.length} are missing from at least one document. (Generated by the offline mock provider – set ANTHROPIC_API_KEY for semantic analysis.)`,
        citations: cites,
      },
      discrepancies,
      missingInformation: missing,
    };
  }
}
