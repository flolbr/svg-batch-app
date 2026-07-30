import { describe, expect, it } from "vitest";
import { dataProjectStateSchema } from "./dataProjectState";

const validState = {
  fileName: "members.xlsx",
  fileSize: 123,
  sheetNames: ["Members"],
  selectedSheetName: "Members",
  worksheets: {
    Members: {
      data: {
        columns: [
          {
            id: "col-0",
            sourceHeader: "Name",
            displayName: "Name",
            sourceIndex: 0,
            inferredType: "text",
          },
        ],
        rows: [
          {
            id: "source-1",
            values: { "col-0": "Ada" },
            displayedValues: { "col-0": "Ada" },
          },
        ],
      },
      selectedRowIds: ["source-1", "manual-1"],
      filters: [
        { type: "values", columnId: "col-0", included: ["Ada"] },
        {
          type: "text",
          columnId: "col-0",
          operator: "contains",
          value: "ad",
        },
        { type: "number", columnId: "col-1", min: 1, max: 10 },
        { type: "date", columnId: "col-2", from: "2026-01-01" },
        { type: "blank", columnId: "col-3", blank: false },
      ],
      rowOverrides: [
        { rowId: "source-1", values: { "col-0": null, "col-1": 5 } },
      ],
      manualRows: [
        { id: "manual-1", values: { "col-0": true, "col-1": null } },
      ],
      columnPreferences: { visible: ["col-0"], exported: ["col-0"] },
    },
  },
};

describe("dataProjectStateSchema", () => {
  it("accepts a complete persisted worksheet state", () => {
    expect(dataProjectStateSchema.parse(validState)).toEqual(validState);
  });

  it("rejects malformed nested values and filters", () => {
    const state = structuredClone(validState);
    Object.assign(state.worksheets.Members.data.rows[0].values, {
      "col-0": { unsupported: true },
    });
    state.worksheets.Members.filters[1] = {
      type: "text",
      columnId: "col-0",
      operator: "startsWith",
      value: "Ada",
    };

    expect(dataProjectStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects unknown fields at every persisted boundary", () => {
    const state = structuredClone(validState);
    Object.assign(state.worksheets.Members.manualRows[0], { unexpected: true });

    const result = dataProjectStateSchema.safeParse(state);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "unrecognized_keys",
            path: ["worksheets", "Members", "manualRows", 0],
          }),
        ]),
      );
    }
  });
});
