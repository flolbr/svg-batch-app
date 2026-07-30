import { describe, expect, it } from "vitest";
import { appTheme } from "./theme";

describe("appTheme", () => {
  it("defines the shared brand and typography defaults", () => {
    expect(appTheme.primaryColor).toBe("brand");
    expect(appTheme.colors?.brand).toHaveLength(10);
    expect(appTheme.colors?.brand?.[6]).toBe("#2874db");
    expect(appTheme.defaultRadius).toBe("sm");
    expect(appTheme.headings?.fontFamily).toBe("inherit");
  });
});
