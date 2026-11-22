import type { Chunk } from "../types.js";

/**
 * Split text into overlapping chunks, preferring paragraph then line then sentence boundaries,
 * so a long document never has to be sent to the model in one piece.
 */
export function chunkText(text: string, maxChars: number, overlap: number): Chunk[] {
  if (text.length <= maxChars) return [{ index: 0, start: 0, end: text.length, text }];
  const chunks: Chunk[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const window = text.slice(start, end);
      const floor = Math.floor(maxChars * 0.5);
      const cut = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf("\n"), window.lastIndexOf(". "));
      if (cut > floor) end = start + cut + 1;
    }
    chunks.push({ index: chunks.length, start, end, text: text.slice(start, end) });
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}
