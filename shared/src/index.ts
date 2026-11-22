import { z } from "zod";

/** Limits shared by client (pre-validation) and server (enforcement). */
export const LIMITS = {
  maxFiles: 8,
  maxFileBytes: 10 * 1024 * 1024,
  maxInstructionChars: 2000,
  allowedExtensions: [".pdf", ".txt", ".md", ".csv"] as readonly string[],
};

/** A pointer back into a source document. `verified` = quote located in extracted text (server-checked). */
export const EvidenceSchema = z.object({
  documentId: z.string(),
  documentName: z.string(),
  quote: z.string(),
  location: z.string().optional(), // e.g. "page 2" or "line 14"
  verified: z.boolean(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

/** EXTRACTED FACT: a value lifted from a document, always with a verbatim quote. */
export const FactSchema = z.object({
  field: z.string(),
  value: z.string(),
  evidence: EvidenceSchema,
});
export type Fact = z.infer<typeof FactSchema>;

export const SeveritySchema = z.enum(["high", "medium", "low"]);

/** AI INTERPRETATION: a judgement derived from facts. Must cite evidence. */
export const DiscrepancySchema = z.object({
  title: z.string(),
  severity: SeveritySchema,
  explanation: z.string(),
  field: z.string().optional(),
  evidence: z.array(EvidenceSchema),
});
export type Discrepancy = z.infer<typeof DiscrepancySchema>;

export const MissingItemSchema = z.object({
  item: z.string(),
  missingFrom: z.array(z.object({ documentId: z.string(), documentName: z.string() })),
  presentIn: z.array(EvidenceSchema),
  explanation: z.string(),
});
export type MissingItem = z.infer<typeof MissingItemSchema>;

export const ComparisonRowSchema = z.object({
  field: z.string(),
  /** documentId -> fact (null when the document has no value) */
  cells: z.record(z.string(), FactSchema.nullable()),
  consistent: z.boolean(),
});
export type ComparisonRow = z.infer<typeof ComparisonRowSchema>;

export const DocumentInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  status: z.enum(["processed", "failed"]),
  error: z.string().nullable(),
  charCount: z.number(),
  pageCount: z.number().nullable(),
  truncated: z.boolean(),
  chunkCount: z.number(),
  factCount: z.number(),
});
export type DocumentInfo = z.infer<typeof DocumentInfoSchema>;

export const AnalysisResultSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  instruction: z.string(),
  provider: z.string(),
  documents: z.array(DocumentInfoSchema),
  /** AI interpretation, with citations */
  summary: z.object({ text: z.string(), citations: z.array(EvidenceSchema) }),
  /** Extracted facts (quote-backed) grouped by field */
  keyValues: z.array(FactSchema),
  comparison: z.object({ rows: z.array(ComparisonRowSchema) }),
  discrepancies: z.array(DiscrepancySchema),
  missingInformation: z.array(MissingItemSchema),
  warnings: z.array(z.string()),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export interface ApiError { error: string; details?: string[] }

/** Normalise a field label so "Licence No." and "licence number" group together. */
export function normaliseField(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\blicen[cs]e\b/g, "license")
    .replace(/\b(no|num|nr)\b/g, "number")
    .replace(/\b(the|of)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalise a value for equality checks (case, whitespace, punctuation, currency formatting). */
export function normaliseValue(value: string): string {
  const v = value.toLowerCase().trim();
  const money = v.match(/^(?:[$£€]|usd|gbp|eur|inr)?\s*(-?[\d,]+(?:\.\d+)?)\s*(m|k|million|thousand)?\s*(?:usd|gbp|eur|inr)?$/);
  if (money && money[1]) {
    let n = parseFloat(money[1].replace(/,/g, ""));
    if (money[2] === "m" || money[2] === "million") n *= 1e6;
    if (money[2] === "k" || money[2] === "thousand") n *= 1e3;
    return `num:${n}`;
  }
  return v
    .replace(/\bstreet\b/g, "st").replace(/\broad\b/g, "rd").replace(/\bavenue\b/g, "ave")
    .replace(/\blimited\b/g, "ltd").replace(/\bincorporated\b/g, "inc")
    .replace(/[.,;]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Render a result as Markdown for "Copy output". Keeps the fact/interpretation distinction explicit. */
export function resultToMarkdown(r: AnalysisResult): string {
  const cite = (e: Evidence) => `[${e.documentName}${e.location ? `, ${e.location}` : ""}${e.verified ? "" : " – unverified quote"}]`;
  const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const out: string[] = [];
  out.push(`# Analysis: ${r.instruction}`, "", `_Provider: ${r.provider} · ${r.createdAt}_`, "");
  out.push("## Documents");
  for (const d of r.documents) out.push(`- ${d.name} — ${d.status}${d.error ? ` (${d.error})` : ""}${d.truncated ? " (truncated)" : ""}`);
  out.push("", "## Summary (AI interpretation)", r.summary.text, "");
  if (r.summary.citations.length) out.push("Sources: " + r.summary.citations.map(cite).join(" "), "");
  const docs = r.documents.filter((d) => d.status === "processed");
  out.push("## Comparison table (extracted facts)");
  if (r.comparison.rows.length) {
    out.push(`| Field | ${docs.map((d) => esc(d.name)).join(" | ")} | Consistent |`);
    out.push(`|---|${docs.map(() => "---").join("|")}|---|`);
    for (const row of r.comparison.rows)
      out.push(`| ${esc(row.field)} | ${docs.map((d) => esc(row.cells[d.id]?.value ?? "—")).join(" | ")} | ${row.consistent ? "yes" : "NO"} |`);
  } else out.push("_No comparable fields._");
  out.push("", "## Discrepancies (AI interpretation)");
  if (!r.discrepancies.length) out.push("_None found._");
  for (const d of r.discrepancies) {
    out.push(`- **[${d.severity.toUpperCase()}] ${d.title}** — ${d.explanation}`);
    for (const e of d.evidence) out.push(`  - ${cite(e)} “${e.quote}”`);
  }
  out.push("", "## Missing information");
  if (!r.missingInformation.length) out.push("_None found._");
  for (const m of r.missingInformation)
    out.push(`- **${m.item}** — missing from: ${m.missingFrom.map((x) => x.documentName).join(", ")}. ${m.explanation}`);
  out.push("", "## Key-value extraction (extracted facts)");
  for (const f of r.keyValues) out.push(`- ${f.field}: **${f.value}** ${cite(f.evidence)}`);
  if (r.warnings.length) out.push("", "## Warnings", ...r.warnings.map((w) => `- ${w}`));
  return out.join("\n");
}
