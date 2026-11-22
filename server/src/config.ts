import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

function int(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export const config = {
  port: int("PORT", 3001),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  databasePath: process.env.DATABASE_PATH ?? path.resolve(here, "../data/workbench.db"),
  /** "anthropic" only when a key is present, otherwise the offline mock. */
  llmProvider: (process.env.LLM_PROVIDER ?? (process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock")) as "anthropic" | "mock",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
  /** Per-document cap on extracted characters; beyond this we truncate and warn. */
  maxDocChars: int("MAX_DOC_CHARS", 200_000),
  /** Size of the slices sent to the model for per-document extraction. */
  chunkChars: int("CHUNK_CHARS", 8_000),
  chunkOverlap: int("CHUNK_OVERLAP", 300),
  llmConcurrency: int("LLM_CONCURRENCY", 3),
  extractTimeoutMs: int("EXTRACT_TIMEOUT_MS", 20_000),
};
export type Config = typeof config;
