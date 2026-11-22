import { LIMITS, type AnalysisResult, type ApiError } from "@workbench/shared";

export interface HistoryItem { id: string; instruction: string; provider: string; createdAt: string; documentCount: number }

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({ error: `Server returned ${res.status}` }));
  if (!res.ok) {
    const e = body as ApiError;
    throw new Error([e.error, ...(e.details ?? [])].join(" — "));
  }
  return body as T;
}

/** Client-side pre-validation mirrors the server rules for fast feedback; the server remains authoritative. */
export function validateFile(f: File): string | null {
  const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
  if (!LIMITS.allowedExtensions.includes(ext)) return `Unsupported type (${LIMITS.allowedExtensions.join(", ")})`;
  if (f.size === 0) return "File is empty";
  if (f.size > LIMITS.maxFileBytes) return `Larger than ${LIMITS.maxFileBytes / 1024 / 1024} MB`;
  return null;
}

export async function runAnalysis(files: File[], instruction: string): Promise<AnalysisResult> {
  const fd = new FormData();
  fd.append("instruction", instruction);
  files.forEach((f) => fd.append("files", f));
  return parse<AnalysisResult>(await fetch("/api/analyses", { method: "POST", body: fd }));
}
export const getAnalysis = async (id: string) => parse<AnalysisResult>(await fetch(`/api/analyses/${id}`));
export const listHistory = async () => parse<HistoryItem[]>(await fetch("/api/analyses"));
export const getConfig = async () => parse<{ provider: string }>(await fetch("/api/config"));
