import { normaliseField, normaliseValue, type ComparisonRow, type Fact } from "@workbench/shared";

/**
 * Deterministic comparison: group extracted facts by normalised field, then flag
 * rows where documents disagree. No AI involved, so this layer is reproducible.
 */
export function buildComparison(factsByDoc: Map<string, Fact[]>): ComparisonRow[] {
  const rows = new Map<string, { label: string; cells: Record<string, Fact | null> }>();
  const docIds = [...factsByDoc.keys()];
  for (const [docId, facts] of factsByDoc) {
    for (const f of facts) {
      const key = normaliseField(f.field);
      if (!key) continue;
      let row = rows.get(key);
      if (!row) {
        row = { label: f.field, cells: Object.fromEntries(docIds.map((d) => [d, null])) };
        rows.set(key, row);
      }
      if (!row.cells[docId]) row.cells[docId] = f; // first occurrence per document wins
    }
  }
  return [...rows.values()].map((r) => {
    const present = Object.values(r.cells).filter((c): c is Fact => c !== null);
    const distinct = new Set(present.map((c) => normaliseValue(c.value)));
    return { field: r.label, cells: r.cells, consistent: distinct.size <= 1 };
  });
}
