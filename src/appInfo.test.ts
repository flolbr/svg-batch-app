import { describe, expect, it } from "vitest";
import { APP_ID, APP_VERSION } from "./appInfo";

describe("application identity", () => {
  it("exposes a stable application ID", () => {
    expect(APP_ID).toBe("svg-batch-generator");
  });

  it("exposes a semantic application version", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
  });
});
