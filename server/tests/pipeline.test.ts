import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { resultToMarkdown } from "@workbench/shared";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import { openDb } from "../src/db/index.js";
import { MockProvider } from "../src/llm/mock.js";
import { analyse } from "../src/pipeline/analyze.js";
import { chunkText } from "../src/pipeline/chunk.js";
import { csvToText } from "../src/pipeline/csv.js";
import { detectKind, DocumentRejected, sanitiseFilename } from "../src/pipeline/validate.js";

const samples = path.resolve(import.meta.dirname, "../../samples/licence-application");
const load = (n: string) => ({ originalname: n, buffer: fs.readFileSync(path.join(samples, n)) });
const files = () => ["application_form.txt", "licence_certificate.txt", "financial_summary.csv", "bank_statement_summary.pdf"].map(load);

describe("validation", () => {
  it("rejects images, mismatched types, binary and empty files", () => {
    expect(() => detectKind("a.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0]))).toThrow(/OCR/);
    expect(() => detectKind("a.pdf", Buffer.from("hello"))).toThrow(DocumentRejected);
    expect(() => detectKind("a.txt", Buffer.from([65, 0, 66]))).toThrow(/binary/);
    expect(() => detectKind("a.exe", Buffer.from("x"))).toThrow(/Unsupported/);
    expect(() => detectKind("a.txt", Buffer.alloc(0))).toThrow(/empty/);
  });
  it("sanitises path traversal in filenames", () => {
    expect(sanitiseFilename("../../etc/passwd")).toBe("passwd");
  });
});

describe("chunking & csv", () => {
  it("splits long text into bounded overlapping chunks covering everything", () => {
    const text = Array.from({ length: 500 }, (_, i) => `Line ${i}: value`).join("\n");
    const chunks = chunkText(text, 1000, 100);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((c) => c.text.length <= 1000)).toBe(true);
    expect(chunks.at(-1)!.end).toBe(text.length);
  });
  it("renders csv rows as labelled lines", () => {
    expect(csvToText('A,B\n"x, y",2')).toContain("A: x, y");
  });
});

describe("analysis pipeline (mock provider)", () => {
  it("detects the planted discrepancies with verified provenance", async () => {
    const { result } = await analyse(files(), "Identify inconsistencies between the application form and supporting documents.", new MockProvider(), config);
    expect(result.documents.every((d) => d.status === "processed")).toBe(true);
    const fields = result.discrepancies.map((d) => d.field);
    expect(fields).toContain("Licence Number");
    expect(fields).toContain("Registered Address");
    expect(fields).toContain("Annual Revenue 2023");
    // "Ltd" vs "Limited" must NOT be flagged
    expect(fields).not.toContain("Company Name");
    // every citation is quote-verified and names its source document
    const all = result.discrepancies.flatMap((d) => d.evidence);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((e) => e.verified && e.documentName)).toBe(true);
    expect(result.keyValues.some((f) => f.evidence.location?.startsWith("page"))).toBe(true); // PDF page provenance
  });

  it("degrades gracefully when some files are invalid", async () => {
    const bad = [{ originalname: "scan.png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2]) }, { originalname: "x.pdf", buffer: Buffer.from("nope") }];
    const { result } = await analyse([...files().slice(0, 2), ...bad], "Compare", new MockProvider(), config);
    expect(result.documents.filter((d) => d.status === "failed")).toHaveLength(2);
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    expect(result.discrepancies.length).toBeGreaterThan(0);
  });

  it("produces markdown that preserves the fact/interpretation split", async () => {
    const { result } = await analyse(files(), "Compare", new MockProvider(), config);
    const md = resultToMarkdown(result);
    expect(md).toContain("(AI interpretation)");
    expect(md).toContain("(extracted facts)");
  });
});

describe("HTTP API", () => {
  const app = () => createApp({ db: openDb(":memory:"), provider: new MockProvider(), cfg: config });
  it("creates and retrieves an analysis", async () => {
    const a = app();
    let req = request(a).post("/api/analyses").field("instruction", "Compare everything");
    for (const f of files()) req = req.attach("files", f.buffer, f.originalname);
    const res = await req;
    expect(res.status).toBe(201);
    const got = await request(a).get(`/api/analyses/${res.body.id}`);
    expect(got.body.discrepancies.length).toBe(res.body.discrepancies.length);
  });
  it("validates input and unreadable uploads", async () => {
    const a = app();
    expect((await request(a).post("/api/analyses").field("instruction", "x")).status).toBe(400);
    const r = await request(a).post("/api/analyses").field("instruction", "x").attach("files", Buffer.from("MZ\0\0"), "evil.exe");
    expect(r.status).toBe(422);
    expect((await request(a).get("/api/analyses/nope")).status).toBe(404);
  });
});
