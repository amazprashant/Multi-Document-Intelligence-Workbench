import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AnalysisResultSchema, type AnalysisResult } from "@workbench/shared";
import type { SourceDocument } from "../types.js";

export type Db = Database.Database;
const here = path.dirname(fileURLToPath(import.meta.url));

export function openDb(file: string): Db {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(fs.readFileSync(path.join(here, "schema.sql"), "utf8"));
  return db;
}

export function saveAnalysis(db: Db, result: AnalysisResult, sources: SourceDocument[]): void {
  const tx = db.transaction(() => {
    db.prepare("INSERT INTO analyses (id, instruction, provider, created_at, result_json) VALUES (?,?,?,?,?)")
      .run(result.id, result.instruction, result.provider, result.createdAt, JSON.stringify(result));
    const insDoc = db.prepare(
      "INSERT INTO documents (id, analysis_id, name, mime_type, size_bytes, sha256, status, error, page_count, truncated, extracted_text) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    const insFact = db.prepare("INSERT INTO facts (document_id, field, value, quote, location, verified) VALUES (?,?,?,?,?,?)");
    for (const s of sources)
      insDoc.run(s.id, result.id, s.name, s.mimeType, s.sizeBytes, s.sha256, s.status, s.error, s.pageCount, s.truncated ? 1 : 0, s.text);
    for (const f of result.keyValues)
      insFact.run(f.evidence.documentId, f.field, f.value, f.evidence.quote, f.evidence.location ?? null, f.evidence.verified ? 1 : 0);
  });
  tx();
}

export function getAnalysis(db: Db, id: string): AnalysisResult | null {
  const row = db.prepare("SELECT result_json FROM analyses WHERE id = ?").get(id) as { result_json: string } | undefined;
  return row ? AnalysisResultSchema.parse(JSON.parse(row.result_json)) : null;
}

export function listAnalyses(db: Db, limit = 20) {
  return db.prepare(
    `SELECT a.id, a.instruction, a.provider, a.created_at AS createdAt,
            (SELECT COUNT(*) FROM documents d WHERE d.analysis_id = a.id) AS documentCount
     FROM analyses a ORDER BY a.created_at DESC LIMIT ?`).all(limit) as
    { id: string; instruction: string; provider: string; createdAt: string; documentCount: number }[];
}
