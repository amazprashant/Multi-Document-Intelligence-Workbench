/** Minimal RFC-4180-ish CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  const s = input.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (inQuotes) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

/** Render CSV as "Header: value" lines per row so downstream extraction sees labelled facts. */
export function csvToText(input: string): string {
  const rows = parseCsv(input);
  if (rows.length === 0) return "";
  const [header = [], ...body] = rows;
  if (body.length === 0) return header.join(", ");
  return body
    .map((r, i) => [`[Row ${i + 1}]`, ...header.map((h, j) => `${h.trim()}: ${(r[j] ?? "").trim()}`)].join("\n"))
    .join("\n\n");
}
