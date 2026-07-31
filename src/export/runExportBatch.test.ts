import { describe, expect, it, vi } from "vitest";
import {
  runExportBatch,
  type ExportBatchItem,
  type ExportBatchProgress,
} from "./runExportBatch";

type TestFile = { filename: string; content: string };

function item(
  rowId: string,
  requestedFilename = `${rowId}.svg`,
  overrides: Partial<ExportBatchItem<TestFile>> = {},
): ExportBatchItem<TestFile> {
  return {
    rowId,
    requestedFilename,
    warnings: [],
    errors: [],
    createFile: async () => ({ filename: requestedFilename, content: rowId }),
    ...overrides,
  };
}

describe("runExportBatch", () => {
  it("runs creators strictly in order without overlap and reports progress", async () => {
    const events: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const first = item("row-1", "requested-one.svg", {
      warnings: ["Font unavailable"],
      createFile: () =>
        new Promise((resolve) => {
          events.push("first-start");
          releaseFirst = () => {
            events.push("first-finish");
            resolve({ filename: "actual-one.svg", content: "one" });
          };
        }),
    });
    const second = item("row-2", "requested-two.svg", {
      createFile: async () => {
        events.push("second-start");
        return { filename: "actual-two.svg", content: "two" };
      },
    });
    const progress: ExportBatchProgress[] = [];
    const task = runExportBatch([first, second], {
      continueOnError: true,
      isCancelled: () => false,
      onProgress: (value) => progress.push(value),
      yieldControl: async () => {
        events.push("yield");
      },
    });

    await vi.waitFor(() => expect(events).toEqual(["first-start"]));
    releaseFirst?.();
    const result = await task;

    expect(events).toEqual([
      "first-start",
      "first-finish",
      "yield",
      "second-start",
      "yield",
    ]);
    expect(progress).toEqual([
      { completed: 0, total: 2, currentFilename: null },
      { completed: 0, total: 2, currentFilename: "requested-one.svg" },
      { completed: 1, total: 2, currentFilename: null },
      { completed: 1, total: 2, currentFilename: "requested-two.svg" },
      { completed: 2, total: 2, currentFilename: null },
    ]);
    expect(result.files).toEqual([
      { filename: "actual-one.svg", content: "one" },
      { filename: "actual-two.svg", content: "two" },
    ]);
    expect(result.entries).toEqual([
      {
        rowId: "row-1",
        requestedFilename: "requested-one.svg",
        actualFilename: "actual-one.svg",
        status: "success",
        outputs: ["actual-one.svg"],
        warnings: ["Font unavailable"],
      },
      {
        rowId: "row-2",
        requestedFilename: "requested-two.svg",
        actualFilename: "actual-two.svg",
        status: "success",
        outputs: ["actual-two.svg"],
        warnings: [],
      },
    ]);
  });

  it("continues after preflight and creation failures", async () => {
    const blockedCreator = vi.fn();
    const result = await runExportBatch(
      [
        item("preflight", undefined, {
          errors: ["Invalid mapping"],
          createFile: blockedCreator,
        }),
        item("thrown", undefined, {
          createFile: async () => Promise.reject("not an Error"),
        }),
        item("success", "requested.svg", {
          createFile: async () => ({ filename: "actual.svg", content: "ok" }),
        }),
      ],
      {
        continueOnError: true,
        isCancelled: () => false,
        onProgress: () => undefined,
        yieldControl: async () => undefined,
      },
    );

    expect(blockedCreator).not.toHaveBeenCalled();
    expect(result.files).toEqual([{ filename: "actual.svg", content: "ok" }]);
    expect(result.entries.map((entry) => entry.status)).toEqual([
      "failed",
      "failed",
      "success",
    ]);
    expect(result.entries[0].error).toBe("Invalid mapping");
    expect(result.entries[1].error).toBe(
      "The export file could not be created.",
    );
    expect(result.failedRowIds).toEqual(["preflight", "thrown"]);
  });

  it("stops after a failure and records remaining rows as skipped", async () => {
    const skippedCreator = vi.fn();
    const progress: ExportBatchProgress[] = [];
    const result = await runExportBatch(
      [
        item("failed", undefined, { errors: ["Bad row"] }),
        item("skipped", undefined, { createFile: skippedCreator }),
      ],
      {
        continueOnError: false,
        isCancelled: () => false,
        onProgress: (value) => progress.push(value),
        yieldControl: async () => undefined,
      },
    );

    expect(skippedCreator).not.toHaveBeenCalled();
    expect(result.entries).toMatchObject([
      { rowId: "failed", status: "failed", error: "Bad row" },
      {
        rowId: "skipped",
        status: "skipped",
        error: "Skipped because a previous export failed.",
      },
    ]);
    expect(result.failedRowIds).toEqual(["failed"]);
    expect(progress.at(-1)).toEqual({
      completed: 2,
      total: 2,
      currentFilename: null,
    });
  });

  it("cancels before the next row and preserves completed successes", async () => {
    let cancelled = false;
    const cancelledCreator = vi.fn();
    const progress: ExportBatchProgress[] = [];
    const result = await runExportBatch(
      [
        item("done"),
        item("cancelled", undefined, { createFile: cancelledCreator }),
        item("also-cancelled"),
      ],
      {
        continueOnError: true,
        isCancelled: () => cancelled,
        onProgress: (value) => progress.push(value),
        yieldControl: async () => {
          cancelled = true;
        },
      },
    );

    expect(cancelledCreator).not.toHaveBeenCalled();
    expect(result.cancelled).toBe(true);
    expect(result.files.map((file) => file.filename)).toEqual(["done.svg"]);
    expect(result.entries.map((entry) => entry.status)).toEqual([
      "success",
      "skipped",
      "skipped",
    ]);
    expect(result.entries.slice(1).map((entry) => entry.error)).toEqual([
      "Skipped because export was cancelled.",
      "Skipped because export was cancelled.",
    ]);
    expect(result.failedRowIds).toEqual([]);
    expect(progress.at(-1)).toEqual({
      completed: 3,
      total: 3,
      currentFilename: null,
    });
  });

  it("does not mutate readonly input data", async () => {
    const inputs = [
      item("row-1", "requested.svg", {
        warnings: ["Warning"],
        errors: ["Preflight error"],
      }),
    ];
    const before = inputs.map(
      ({ rowId, requestedFilename, warnings, errors }) => ({
        rowId,
        requestedFilename,
        warnings: [...warnings],
        errors: [...errors],
      }),
    );

    await runExportBatch(inputs, {
      continueOnError: true,
      isCancelled: () => false,
      onProgress: () => undefined,
      yieldControl: async () => undefined,
    });

    expect(
      inputs.map(({ rowId, requestedFilename, warnings, errors }) => ({
        rowId,
        requestedFilename,
        warnings: [...warnings],
        errors: [...errors],
      })),
    ).toEqual(before);
  });
});
