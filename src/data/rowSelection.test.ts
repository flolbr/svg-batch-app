import { describe, expect, it } from "vitest";
import {
  deselectRows,
  getRowSelectionState,
  selectRows,
  toggleSelectedRow,
} from "./rowSelection";

describe("row selection", () => {
  it("adds an unselected row without mutating the current selection", () => {
    const selectedRowIds = ["row-1"];

    expect(toggleSelectedRow(selectedRowIds, "row-2")).toEqual([
      "row-1",
      "row-2",
    ]);
    expect(selectedRowIds).toEqual(["row-1"]);
  });

  it("removes a selected row without changing the remaining order", () => {
    expect(toggleSelectedRow(["row-1", "row-2", "row-3"], "row-2")).toEqual([
      "row-1",
      "row-3",
    ]);
  });

  it("selects every requested row once while preserving existing order", () => {
    expect(
      selectRows(["hidden-row", "row-2"], ["row-1", "row-2", "row-3"]),
    ).toEqual(["hidden-row", "row-2", "row-1", "row-3"]);
  });

  it("deselects only the requested rows", () => {
    expect(
      deselectRows(["hidden-row", "row-1", "row-2"], ["row-1", "missing-row"]),
    ).toEqual(["hidden-row", "row-2"]);
  });

  it("reports none, some, and all for a target row set", () => {
    expect(getRowSelectionState(["hidden-row"], [])).toBe("none");
    expect(getRowSelectionState(["hidden-row"], ["row-1", "row-2"])).toBe(
      "none",
    );
    expect(
      getRowSelectionState(["hidden-row", "row-1"], ["row-1", "row-2"]),
    ).toBe("some");
    expect(
      getRowSelectionState(
        ["hidden-row", "row-1", "row-2"],
        ["row-1", "row-2"],
      ),
    ).toBe("all");
  });
});
