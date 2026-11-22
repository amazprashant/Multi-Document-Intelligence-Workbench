import type { Evidence } from "@workbench/shared";

export interface Chunk { index: number; start: number; end: number; text: string }

export interface ExtractedText {
  text: string;
  pageCount: number | null;
  /** Character offsets where each PDF page begins (for page-level provenance). */
  pageStarts: number[] | null;
}

export interface SourceDocument {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status: "processed" | "failed";
  error: string | null;
  text: string;
  pageCount: number | null;
  pageStarts: number[] | null;
  truncated: boolean;
  chunks: Chunk[];
}

/** What the model (or mock) returns for fact extraction: unverified until the server checks the quote. */
export interface RawFact { field: string; value: string; quote: string }

export interface InterpretDoc { id: string; name: string; facts: { field: string; value: string; quote: string }[] }
export interface InterpretInput {
  instruction: string;
  documents: InterpretDoc[];
  /** Deterministic comparison rows, so the model interprets rather than re-derives. */
  rows: { field: string; consistent: boolean; values: Record<string, string | null> }[];
}
export interface RawInterpretation {
  summary: { text: string; citations: { documentId: string; quote: string }[] };
  discrepancies: {
    title: string; severity: "high" | "medium" | "low"; explanation: string; field?: string;
    evidence: { documentId: string; quote: string }[];
  }[];
  missingInformation: { item: string; missingFromDocumentIds: string[]; explanation: string }[];
}

export interface LlmProvider {
  readonly name: string;
  extractFacts(input: { instruction: string; documentName: string; chunk: Chunk; chunkCount: number }): Promise<RawFact[]>;
  interpret(input: InterpretInput): Promise<RawInterpretation>;
}

export type { Evidence };
