import { describe, expect, it } from "vitest";
import {
  createManualRow,
  deleteManualRow,
  duplicateManualRow,
  manualRowsToSourceRows,
  pasteManualCells,
  updateManualCell,
  type ManualRow,
} from "./manualRows";

const columns = ["col-0", "col-1", "col-2"];
const dataColumns = columns.map((id, sourceIndex) => ({
  id,
  sourceHeader: id,
  displayName: id,
  sourceIndex,
  inferredType: sourceIndex === 1 ? ("number" as const) : ("text" as const),
}));
const rows: ManualRow[] = [
  {
    id: "manual-1",
    values: { "col-0": "Ada", "col-1": null, "col-2": "London" },
  },
];

describe("manual rows", () => {
  it("creates a blank row with a stable generated ID", () => {
    expect(createManualRow(columns, () => "manual-1")).toEqual({
      id: "manual-1",
      values: { "col-0": null, "col-1": null, "col-2": null },
    });
  });

  it("updates a cell immutably and stores an empty input as null", () => {
    const updated = updateManualCell(rows, "manual-1", "col-1", "Member");

    expect(updated[0].values["col-1"]).toBe("Member");
    expect(rows[0].values["col-1"]).toBeNull();
    expect(
      updateManualCell(updated, "manual-1", "col-1", "")[0].values["col-1"],
    ).toBeNull();
  });

  it("duplicates beside the source row and deletes only the target", () => {
    const duplicated = duplicateManualRow(rows, "manual-1", () => "manual-2");

    expect(duplicated).toEqual([
      rows[0],
      {
        id: "manual-2",
        values: { "col-0": "Ada", "col-1": null, "col-2": "London" },
      },
    ]);
    expect(duplicated[1].values).not.toBe(rows[0].values);
    expect(deleteManualRow(duplicated, "manual-1")).toEqual([duplicated[1]]);
  });

  it("pastes tabular cells and appends blank-backed rows when needed", () => {
    const pasted = pasteManualCells(
      rows,
      "manual-1",
      "col-1",
      columns,
      "Member\tParis\nGuest\tLyon\n",
      () => "manual-2",
    );

    expect(pasted).toEqual([
      {
        id: "manual-1",
        values: {
          "col-0": "Ada",
          "col-1": "Member",
          "col-2": "Paris",
        },
      },
      {
        id: "manual-2",
        values: {
          "col-0": null,
          "col-1": "Guest",
          "col-2": "Lyon",
        },
      },
    ]);
  });

  it("converts manual display strings and typed numbers into source rows", () => {
    const numericRows = updateManualCell(rows, "manual-1", "col-1", "42");

    expect(manualRowsToSourceRows(numericRows, dataColumns)).toEqual([
      {
        id: "manual-1",
        values: { "col-0": "Ada", "col-1": 42, "col-2": "London" },
        displayedValues: {
          "col-0": "Ada",
          "col-1": "42",
          "col-2": "London",
        },
      },
    ]);
  });
});
