import { describe, expect, it } from "vitest";
import type { SourceRow } from "./normalizeWorkbook";
import {
  createRowSearchIndex,
  normalizeSearchText,
  searchRows,
} from "./searchRows";

const rows: SourceRow[] = [
  {
    id: "row-1",
    values: { "col-0": "Chloé Petit", "col-1": "Paris" },
    displayedValues: { "col-0": "Chloé Petit", "col-1": "Paris" },
  },
  {
    id: "row-2",
    values: { "col-0": "Alice Martin", "col-1": "Lyon" },
    displayedValues: { "col-0": "Alice Martin", "col-1": "Lyon" },
  },
];

describe("row search", () => {
  it("normalizes case, accents, and whitespace", () => {
    expect(normalizeSearchText("  Chloé\tPETIT  ")).toBe("chloe petit");
  });

  it("fuzzily matches every query term across all displayed values", () => {
    const index = createRowSearchIndex(rows, ["col-0", "col-1"]);

    expect(searchRows(index, rows, "shloe pari", "all")).toEqual([rows[0]]);
    expect(searchRows(index, rows, "chloe lyon", "all")).toEqual([]);
  });

  it("limits matches to the selected column and preserves source order", () => {
    const index = createRowSearchIndex(rows, ["col-0", "col-1"]);

    expect(searchRows(index, rows, "paris", "col-0")).toEqual([]);
    expect(searchRows(index, rows, "paris", "col-1")).toEqual([rows[0]]);
    expect(searchRows(index, rows, "", "col-1")).toBe(rows);
  });
});
