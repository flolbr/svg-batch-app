import { describe, expect, it } from "vitest";
import type { DataColumn, SourceRow } from "./normalizeWorkbook";
import {
  getEffectiveSourceRows,
  resetRowOverride,
  updateRowOverride,
  type RowOverride,
} from "./rowOverrides";

const columns: DataColumn[] = [
  {
    id: "col-0",
    sourceHeader: "Name",
    displayName: "Name",
    sourceIndex: 0,
    inferredType: "text",
  },
  {
    id: "col-1",
    sourceHeader: "Member ID",
    displayName: "Member ID",
    sourceIndex: 1,
    inferredType: "number",
  },
];
const sourceRows: SourceRow[] = [
  {
    id: "source-1",
    values: { "col-0": "Ada", "col-1": 123 },
    displayedValues: { "col-0": "Ada", "col-1": "00123" },
  },
  {
    id: "source-2",
    values: { "col-0": "Grace", "col-1": 456 },
    displayedValues: { "col-0": "Grace", "col-1": "00456" },
  },
];

describe("row overrides", () => {
  it("updates cells without mutating the source row or current overrides", () => {
    const overrides: RowOverride[] = [];
    const updated = updateRowOverride(
      overrides,
      sourceRows[0],
      "col-0",
      "Augusta",
    );

    expect(updated).toEqual([
      { rowId: "source-1", values: { "col-0": "Augusta" } },
    ]);
    expect(overrides).toEqual([]);
    expect(sourceRows[0].displayedValues["col-0"]).toBe("Ada");
  });

  it("removes restored cells and empty row overrides", () => {
    const overrides: RowOverride[] = [
      {
        rowId: "source-1",
        values: { "col-0": "Augusta", "col-1": "00124" },
      },
    ];

    const oneRestored = updateRowOverride(
      overrides,
      sourceRows[0],
      "col-0",
      "Ada",
    );
    expect(oneRestored).toEqual([
      { rowId: "source-1", values: { "col-1": "00124" } },
    ]);
    expect(
      updateRowOverride(oneRestored, sourceRows[0], "col-1", "00123"),
    ).toEqual([]);
  });

  it("builds effective rows with displayed overrides and typed numbers", () => {
    const overrides: RowOverride[] = [
      {
        rowId: "source-1",
        values: { "col-0": null, "col-1": "00124" },
      },
    ];

    const effective = getEffectiveSourceRows(sourceRows, overrides, columns);

    expect(effective).toEqual([
      {
        id: "source-1",
        values: { "col-0": null, "col-1": 124 },
        displayedValues: { "col-0": "", "col-1": "00124" },
      },
      sourceRows[1],
    ]);
    expect(effective[1]).toBe(sourceRows[1]);
    expect(sourceRows[0].values).toEqual({ "col-0": "Ada", "col-1": 123 });
  });

  it("resets only the requested row override", () => {
    const overrides: RowOverride[] = [
      { rowId: "source-1", values: { "col-0": "Augusta" } },
      { rowId: "source-2", values: { "col-0": "Amazing Grace" } },
    ];

    expect(resetRowOverride(overrides, "source-1")).toEqual([overrides[1]]);
  });
});
