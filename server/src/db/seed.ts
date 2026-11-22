/** Seeds the DB by running the real pipeline over the synthetic samples. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { analyse } from "../pipeline/analyze.js";
import { MockProvider } from "../llm/mock.js";
import { openDb, saveAnalysis } from "./index.js";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../samples/licence-application");
const db = openDb(config.databasePath);
const files = fs.readdirSync(dir).filter((f) => !f.startsWith(".")).map((f) => ({ originalname: f, buffer: fs.readFileSync(path.join(dir, f)) }));
const { result, sources } = await analyse(files, "Identify inconsistencies between the application form and supporting documents.", new MockProvider(), config);
saveAnalysis(db, result, sources);
console.log(`Seeded analysis ${result.id}: ${result.documents.length} docs, ${result.discrepancies.length} discrepancies`);
