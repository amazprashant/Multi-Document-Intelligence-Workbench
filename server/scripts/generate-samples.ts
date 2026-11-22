/** Generates a synthetic PDF supporting document (kept reproducible rather than committing opaque binaries only). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../samples/licence-application/bank_statement_summary.pdf");
const doc = new PDFDocument();
const stream = fs.createWriteStream(out);
doc.pipe(stream);
doc.fontSize(14).text("SYNTHETIC DOCUMENT - FICTIONAL DATA");
doc.moveDown().fontSize(12).text("Bank Statement Summary - FY2023");
doc.moveDown();
doc.text("Company Name: Northwind Remittance Ltd");
doc.text("Registered Address: 14 Harbour St, Portsmouth PO1 2AB");
doc.text("Annual Revenue 2023: $4,200,000");
doc.text("Director: Priya Raman");
doc.addPage().text("Closing Balance: $812,300");
doc.end();
stream.on("finish", () => console.log("wrote", out));
