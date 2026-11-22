import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import { LIMITS, type ApiError } from "@workbench/shared";
import type { Config } from "./config.js";
import { getAnalysis, listAnalyses, saveAnalysis, type Db } from "./db/index.js";
import { analyse } from "./pipeline/analyze.js";
import type { LlmProvider } from "./types.js";

export function createApp(deps: { db: Db; provider: LlmProvider; cfg: Config }) {
  const { db, provider, cfg } = deps;
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: cfg.clientOrigin }));
  app.use(rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false }));

  // Memory storage: uploads never touch the filesystem, so no path traversal / orphaned temp files.
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: LIMITS.maxFileBytes, files: LIMITS.maxFiles, fields: 5, fieldSize: LIMITS.maxInstructionChars * 4 },
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true, provider: provider.name }));
  app.get("/api/config", (_req, res) => res.json({ provider: provider.name, limits: LIMITS }));
  app.get("/api/analyses", (_req, res) => res.json(listAnalyses(db)));
  app.get("/api/analyses/:id", (req, res) => {
    const r = getAnalysis(db, req.params.id);
    if (!r) return res.status(404).json({ error: "Analysis not found" } satisfies ApiError);
    res.json(r);
  });

  app.post("/api/analyses", upload.array("files", LIMITS.maxFiles), async (req, res, next) => {
    try {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const instruction = typeof req.body?.instruction === "string" ? req.body.instruction.trim() : "";
      const problems: string[] = [];
      if (files.length === 0) problems.push("Upload at least one document.");
      if (!instruction) problems.push("Provide an analysis instruction.");
      if (instruction.length > LIMITS.maxInstructionChars) problems.push(`Instruction must be at most ${LIMITS.maxInstructionChars} characters.`);
      if (problems.length) return res.status(400).json({ error: "Invalid request", details: problems } satisfies ApiError);

      const { result, sources } = await analyse(
        // multer decodes filenames as latin1; recover UTF-8
        files.map((f) => ({ originalname: Buffer.from(f.originalname, "latin1").toString("utf8"), buffer: f.buffer })),
        instruction, provider, cfg,
      );
      if (!sources.some((s) => s.status === "processed"))
        return res.status(422).json({ error: "None of the uploaded documents could be read.", details: result.warnings } satisfies ApiError);
      saveAnalysis(db, result, sources);
      res.status(201).json(result);
    } catch (e) { next(e); }
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const msg: Record<string, string> = {
        LIMIT_FILE_SIZE: `A file exceeds the ${LIMITS.maxFileBytes / 1024 / 1024} MB limit.`,
        LIMIT_FILE_COUNT: `At most ${LIMITS.maxFiles} files are allowed.`,
        LIMIT_UNEXPECTED_FILE: `Send files in the "files" field (max ${LIMITS.maxFiles}).`,
      };
      return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: msg[err.code] ?? "Upload rejected." } satisfies ApiError);
    }
    console.error(err); // details stay in the server log, never in the response
    res.status(500).json({ error: "Internal server error" } satisfies ApiError);
  };
  app.use(onError);
  return app;
}
