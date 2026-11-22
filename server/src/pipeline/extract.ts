import { createRequire } from "node:module";
import type { FileKind } from "./validate.js";
import { DocumentRejected } from "./validate.js";
import { csvToText } from "./csv.js";
import type { ExtractedText } from "../types.js";

const require = createRequire(import.meta.url);
// Import the inner module: pdf-parse's index.js runs a debug routine when it thinks it is the entry point.
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
  data: Buffer,
  opts?: { pagerender?: (page: any) => Promise<string> },
) => Promise<{ numpages: number; text: string }>;

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let t: NodeJS.Timeout;
  const timeout = new Promise<never>((_, rej) => { t = setTimeout(() => rej(new DocumentRejected(`${what} timed out.`)), ms); });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

async function extractPdf(buf: Buffer, timeoutMs: number): Promise<ExtractedText> {
  const pages: string[] = [];
  const pagerender = async (page: any) => {
    const content = await page.getTextContent({ normalizeWhitespace: true });
    let lastY: number | undefined, text = "";
    for (const item of content.items) {
      const y = item.transform[5];
      text += lastY === undefined || lastY === y ? item.str : "\n" + item.str;
      lastY = y;
    }
    pages.push(text);
    return text;
  };
  // pdf.js can fail the first attempts on files with a damaged xref table and then recover by rebuilding it,
  // so retry a couple of times before declaring the file unreadable.
  let parsed: { numpages: number } | undefined;
  for (let attempt = 1; attempt <= 3 && !parsed; attempt++) {
    pages.length = 0;
    try {
      parsed = await withTimeout(pdfParse(buf, { pagerender }), timeoutMs, "PDF parsing");
    } catch (e) {
      if (e instanceof DocumentRejected) throw e;
      if (attempt === 3) throw new DocumentRejected("PDF could not be read (corrupt or encrypted).");
    }
  }
  if (!parsed) throw new DocumentRejected("PDF could not be read (corrupt or encrypted).");
  const pageStarts: number[] = [];
  let text = "", offset = 0;
  for (const p of pages) {
    pageStarts.push(offset);
    text += p + "\n\n";
    offset = text.length;
  }
  return { text: text.trimEnd(), pageCount: parsed.numpages, pageStarts };
}

export async function extractText(buf: Buffer, kind: FileKind, timeoutMs: number): Promise<ExtractedText> {
  let result: ExtractedText;
  if (kind.kind === "pdf") result = await extractPdf(buf, timeoutMs);
  else {
    const raw = buf.toString("utf8").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    result = { text: kind.kind === "csv" ? csvToText(raw) : raw, pageCount: null, pageStarts: null };
  }
  if (result.text.trim().length === 0)
    throw new DocumentRejected(kind.kind === "pdf" ? "No extractable text (scanned PDF? OCR is not enabled)." : "File contains no text.");
  return result;
}
