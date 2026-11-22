import { randomUUID, createHash } from "node:crypto";
import { normaliseField, type AnalysisResult, type DocumentInfo, type Evidence, type Fact } from "@workbench/shared";
import type { Config } from "../config.js";
import type { LlmProvider, RawInterpretation, SourceDocument } from "../types.js";
import { chunkText } from "./chunk.js";
import { buildComparison } from "./compare.js";
import { extractText } from "./extract.js";
import { buildEvidence } from "./provenance.js";
import { DocumentRejected, detectKind, sanitiseFilename } from "./validate.js";

export interface UploadedFile { originalname: string; buffer: Buffer }
type PipelineCfg = Pick<Config, "maxDocChars" | "chunkChars" | "chunkOverlap" | "llmConcurrency" | "extractTimeoutMs">;

/** Stage 1: validate + extract + chunk a single file. Never throws: failures become a "failed" document. */
export async function ingestFile(file: UploadedFile, cfg: PipelineCfg): Promise<SourceDocument> {
  const name = sanitiseFilename(file.originalname);
  const base = {
    id: randomUUID(), name, sizeBytes: file.buffer.length,
    sha256: createHash("sha256").update(file.buffer).digest("hex"),
  };
  const failed = (error: string, mimeType = "unknown"): SourceDocument => ({
    ...base, mimeType, status: "failed", error, text: "", pageCount: null, pageStarts: null, truncated: false, chunks: [],
  });
  try {
    const kind = detectKind(name, file.buffer);
    const ex = await extractText(file.buffer, kind, cfg.extractTimeoutMs);
    const truncated = ex.text.length > cfg.maxDocChars;
    const text = truncated ? ex.text.slice(0, cfg.maxDocChars) : ex.text;
    return {
      ...base, mimeType: kind.mimeType, status: "processed", error: null, text,
      pageCount: ex.pageCount, pageStarts: ex.pageStarts?.filter((s) => s < text.length) ?? null,
      truncated, chunks: chunkText(text, cfg.chunkChars, cfg.chunkOverlap),
    };
  } catch (e) {
    return failed(e instanceof DocumentRejected ? e.message : "Unexpected error while reading this file.");
  }
}

/** Run async tasks with bounded concurrency, preserving order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]!); }
  }));
  return out;
}

export interface AnalysisOutput { result: AnalysisResult; sources: SourceDocument[] }

export async function analyse(
  files: UploadedFile[], instruction: string, provider: LlmProvider, cfg: PipelineCfg,
): Promise<AnalysisOutput> {
  const warnings: string[] = [];
  const sources = await Promise.all(files.map((f) => ingestFile(f, cfg)));
  const ok = sources.filter((s) => s.status === "processed");
  for (const s of sources) {
    if (s.status === "failed") warnings.push(`${s.name}: ${s.error}`);
    if (s.truncated) warnings.push(`${s.name}: content truncated to ${cfg.maxDocChars.toLocaleString()} characters.`);
  }
  if (ok.length === 1) warnings.push("Only one document was readable, so no cross-document comparison is possible.");

  // Stage 2: per-document extraction (documents analysed independently; chunks bounded in size & concurrency).
  const factsByDoc = new Map<string, Fact[]>();
  for (const doc of ok) factsByDoc.set(doc.id, []);
  const jobs = ok.flatMap((doc) => doc.chunks.map((chunk) => ({ doc, chunk })));
  const results = await mapLimit(jobs, cfg.llmConcurrency, async ({ doc, chunk }) => {
    try {
      return { doc, raw: await provider.extractFacts({ instruction, documentName: doc.name, chunk, chunkCount: doc.chunks.length }) };
    } catch (e) {
      warnings.push(`${doc.name}: extraction failed for part ${chunk.index + 1}/${doc.chunks.length} (${(e as Error).message}).`);
      return { doc, raw: [] };
    }
  });
  const seen = new Set<string>();
  let unverified = 0;
  for (const { doc, raw } of results) {
    for (const r of raw) {
      const key = `${doc.id}|${normaliseField(r.field)}|${r.value.trim().toLowerCase()}`;
      if (!r.field.trim() || !r.value.trim() || seen.has(key)) continue;
      seen.add(key);
      const evidence = buildEvidence(doc, r.quote);
      if (!evidence.verified) unverified++;
      factsByDoc.get(doc.id)!.push({ field: r.field.trim(), value: r.value.trim(), evidence });
    }
  }
  if (unverified) warnings.push(`${unverified} extracted fact(s) have quotes that could not be located in the source text and are marked unverified.`);

  // Stage 3: deterministic comparison, then AI interpretation over facts only.
  const rows = buildComparison(factsByDoc);
  let interp: RawInterpretation = { summary: { text: "No documents could be analysed.", citations: [] }, discrepancies: [], missingInformation: [] };
  if (ok.length > 0) {
    try {
      interp = await provider.interpret({
        instruction,
        documents: ok.map((d) => ({ id: d.id, name: d.name, facts: (factsByDoc.get(d.id) ?? []).map((f) => ({ field: f.field, value: f.value, quote: f.evidence.quote })) })),
        rows: rows.map((r) => ({ field: r.field, consistent: r.consistent, values: Object.fromEntries(Object.entries(r.cells).map(([k, v]) => [k, v?.value ?? null])) })),
      });
    } catch (e) {
      warnings.push(`Interpretation step failed (${(e as Error).message}); showing extracted facts only.`);
      interp.summary.text = "AI interpretation was unavailable. The extracted facts and comparison table below are still valid.";
    }
  }

  const byId = new Map(ok.map((d) => [d.id, d]));
  const resolve = (c: { documentId: string; quote: string }): Evidence | null => {
    const d = byId.get(c.documentId);
    if (!d) { warnings.push(`Dropped a citation to unknown document id "${c.documentId}".`); return null; }
    return buildEvidence(d, c.quote);
  };
  const compact = <T>(xs: (T | null)[]): T[] => xs.filter((x): x is T => x !== null);

  const documents: DocumentInfo[] = sources.map((s) => ({
    id: s.id, name: s.name, mimeType: s.mimeType, sizeBytes: s.sizeBytes, status: s.status, error: s.error,
    charCount: s.text.length, pageCount: s.pageCount, truncated: s.truncated, chunkCount: s.chunks.length,
    factCount: factsByDoc.get(s.id)?.length ?? 0,
  }));

  const result: AnalysisResult = {
    id: randomUUID(), createdAt: new Date().toISOString(), instruction, provider: provider.name, documents,
    summary: { text: interp.summary.text, citations: compact(interp.summary.citations.map(resolve)) },
    keyValues: [...factsByDoc.values()].flat(),
    comparison: { rows },
    discrepancies: interp.discrepancies.map((d) => ({ ...d, evidence: compact(d.evidence.map(resolve)) })),
    missingInformation: interp.missingInformation.map((m) => ({
      item: m.item, explanation: m.explanation,
      missingFrom: compact(m.missingFromDocumentIds.map((id) => byId.get(id) ? { documentId: id, documentName: byId.get(id)!.name } : null)),
      presentIn: rows.find((r) => normaliseField(r.field) === normaliseField(m.item))
        ? Object.values(rows.find((r) => normaliseField(r.field) === normaliseField(m.item))!.cells).filter((c): c is Fact => c !== null).map((c) => c.evidence)
        : [],
    })),
    warnings: [...new Set(warnings)],
  };
  return { result, sources };
}
