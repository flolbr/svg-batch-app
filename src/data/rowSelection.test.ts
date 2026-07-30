import { describe, expect, it } from "vitest";
import { toggleSelectedRow } from "./rowSelection";

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
});
