import path from "node:path";
import { LIMITS } from "@workbench/shared";

export class DocumentRejected extends Error {}

export interface FileKind { kind: "pdf" | "text" | "csv"; mimeType: string }

const IMAGE_MAGIC: [string, number[]][] = [
  ["PNG", [0x89, 0x50, 0x4e, 0x47]],
  ["JPEG", [0xff, 0xd8, 0xff]],
  ["GIF", [0x47, 0x49, 0x46, 0x38]],
];

/** Strip path components and control characters so names are safe to store/display. */
export function sanitiseFilename(raw: string): string {
  const base = path.basename(raw.replace(/\\/g, "/"));
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").trim();
  return (clean || "unnamed").slice(0, 120);
}

/**
 * Validate by extension allow-list AND content sniffing – never trust the client-supplied MIME type.
 * Throws DocumentRejected with a user-facing reason.
 */
export function detectKind(name: string, buf: Buffer): FileKind {
  const ext = path.extname(name).toLowerCase();
  if (buf.length === 0) throw new DocumentRejected("File is empty.");

  const img = IMAGE_MAGIC.find(([, sig]) => sig.every((b, i) => buf[i] === b));
  if (img) throw new DocumentRejected(`Unsupported: ${img[0]} images need OCR, which is not enabled in this build.`);

  if (!LIMITS.allowedExtensions.includes(ext))
    throw new DocumentRejected(`Unsupported file type "${ext || "none"}". Allowed: ${LIMITS.allowedExtensions.join(", ")}.`);

  const isPdfMagic = buf.subarray(0, 5).toString("latin1") === "%PDF-";
  if (ext === ".pdf") {
    if (!isPdfMagic) throw new DocumentRejected("File has a .pdf extension but is not a valid PDF.");
    return { kind: "pdf", mimeType: "application/pdf" };
  }
  if (isPdfMagic) throw new DocumentRejected(`File content is a PDF but the extension is "${ext}".`);

  // Text-like formats: reject binary content (NUL bytes) and invalid UTF-8.
  if (buf.subarray(0, 8192).includes(0)) throw new DocumentRejected("File appears to be binary, not text.");
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    throw new DocumentRejected("File is not valid UTF-8 text.");
  }
  return ext === ".csv" ? { kind: "csv", mimeType: "text/csv" } : { kind: "text", mimeType: "text/plain" };
}
