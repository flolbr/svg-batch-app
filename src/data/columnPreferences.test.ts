import { describe, expect, it } from "vitest";
import {
  createColumnPreferences,
  setColumnPreference,
} from "./columnPreferences";

const columnIds = ["col-0", "col-1", "col-2"];

describe("column preferences", () => {
  it("shows and exports every column by default", () => {
    expect(createColumnPreferences(columnIds)).toEqual({
      visible: columnIds,
      exported: columnIds,
    });
  });

  it("changes visible and exported columns independently in source order", () => {
    const initial = createColumnPreferences(columnIds);
    const hidden = setColumnPreference(
      initial,
      "visible",
      "col-1",
      false,
      columnIds,
    );
    const notExported = setColumnPreference(
      hidden,
      "exported",
      "col-0",
      false,
      columnIds,
    );

    expect(notExported).toEqual({
      visible: ["col-0", "col-2"],
      exported: ["col-1", "col-2"],
    });
    expect(initial).toEqual({
      visible: columnIds,
      exported: columnIds,
    });
  });

  it("restores a preference at its source position without duplicates", () => {
    const preferences = {
      visible: ["col-0", "col-2"],
      exported: columnIds,
    };

    expect(
      setColumnPreference(preferences, "visible", "col-1", true, columnIds)
        .visible,
    ).toEqual(columnIds);
  });
});
