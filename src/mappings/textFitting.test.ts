import { describe, expect, it } from "vitest";
import { fitText, isTextFitMetrics, type TextFitMetrics } from "./textFitting";

const metrics: TextFitMetrics = {
  availableWidth: 20,
  fontSize: 10,
  measure: (text, fontSize) => Array.from(text).length * fontSize,
};

describe("text fitting", () => {
  it("recognizes valid metrics", () => {
    expect(isTextFitMetrics(metrics)).toBe(true);
    expect(isTextFitMetrics({ ...metrics, availableWidth: 0 })).toBe(false);
  });

  it("shrinks and truncates text without splitting Unicode code points", () => {
    expect(fitText("hello", "shrink", undefined, metrics)).toMatchObject({
      text: "hello",
      fontSize: 4,
      overflow: false,
    });
    expect(fitText("A😀BC", "truncate", undefined, metrics)).toEqual({
      text: "A…",
      overflow: false,
    });
  });

  it("uses an empty string when an ellipsis cannot fit", () => {
    expect(
      fitText("hello", "truncate", undefined, {
        ...metrics,
        availableWidth: 5,
      }),
    ).toEqual({ text: "", overflow: false });
  });
});
