import { describe, expect, it } from "vitest";
import type { SourceRow } from "./normalizeWorkbook";
import {
  filterRows,
  getDistinctColumnValues,
  type ColumnFilter,
} from "./filterRows";

const rows: SourceRow[] = [
  {
    id: "row-1",
    values: {
      "col-0": "Chloé",
      "col-1": 10,
      "col-2": "2026-01-10T12:00:00.000Z",
      "col-3": null,
    },
    displayedValues: {
      "col-0": "Chloé",
      "col-1": "10",
      "col-2": "10/01/2026",
      "col-3": "",
    },
  },
  {
    id: "row-2",
    values: {
      "col-0": "Alice",
      "col-1": 20,
      "col-2": "2026-02-15T12:00:00.000Z",
      "col-3": "Ready",
    },
    displayedValues: {
      "col-0": "Alice",
      "col-1": "20",
      "col-2": "15/02/2026",
      "col-3": "Ready",
    },
  },
  {
    id: "row-3",
    values: {
      "col-0": "Chloé",
      "col-1": null,
      "col-2": null,
      "col-3": " ",
    },
    displayedValues: {
      "col-0": "Chloé",
      "col-1": "",
      "col-2": "",
      "col-3": " ",
    },
  },
];

describe("column filters", () => {
  it("lists distinct displayed values in source order", () => {
    expect(getDistinctColumnValues(rows, "col-0")).toEqual(["Chloé", "Alice"]);
  });

  it("matches included values and normalized text operators", () => {
    expect(
      filterRows(rows, [
        { type: "values", columnId: "col-0", included: ["Alice"] },
      ]),
    ).toEqual([rows[1]]);
    expect(
      filterRows(rows, [
        {
          type: "text",
          columnId: "col-0",
          operator: "contains",
          value: "chlo",
        },
      ]),
    ).toEqual([rows[0], rows[2]]);
    expect(
      filterRows(rows, [
        {
          type: "text",
          columnId: "col-0",
          operator: "equals",
          value: "chloe",
        },
      ]),
    ).toEqual([rows[0], rows[2]]);
  });

  it("matches inclusive number and date ranges", () => {
    expect(
      filterRows(rows, [
        { type: "number", columnId: "col-1", min: 15, max: 20 },
      ]),
    ).toEqual([rows[1]]);
    expect(
      filterRows(rows, [
        {
          type: "date",
          columnId: "col-2",
          from: "2026-01-10",
          to: "2026-01-10",
        },
      ]),
    ).toEqual([rows[0]]);
  });

  it("matches blank and non-blank displayed values", () => {
    expect(
      filterRows(rows, [{ type: "blank", columnId: "col-3", blank: true }]),
    ).toEqual([rows[0], rows[2]]);
    expect(
      filterRows(rows, [{ type: "blank", columnId: "col-3", blank: false }]),
    ).toEqual([rows[1]]);
  });

  it("combines every filter with AND semantics and keeps source order", () => {
    const filters: ColumnFilter[] = [
      {
        type: "text",
        columnId: "col-0",
        operator: "contains",
        value: "chlo",
      },
      { type: "number", columnId: "col-1", min: 5 },
    ];

    expect(filterRows(rows, filters)).toEqual([rows[0]]);
    expect(filterRows(rows, [])).toBe(rows);
  });
});
