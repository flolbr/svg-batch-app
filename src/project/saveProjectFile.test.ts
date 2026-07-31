import { describe, expect, it, vi } from "vitest";
import {
  saveProjectWithFilePicker,
  type ProjectFileHandle,
  type ProjectFileWritable,
} from "./saveProjectFile";

function writable(overrides: Partial<ProjectFileWritable> = {}): {
  writable: ProjectFileWritable;
  write: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
} {
  const write = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn().mockResolvedValue(undefined);
  const abort = vi.fn().mockResolvedValue(undefined);

  return {
    writable: { write, close, abort, ...overrides },
    write,
    close,
    abort,
  };
}

function handle(writable: ProjectFileWritable): ProjectFileHandle {
  return { createWritable: vi.fn().mockResolvedValue(writable) };
}

describe("saveProjectWithFilePicker", () => {
  it("picks an HTML file and writes the supplied HTML blob", async () => {
    const stream = writable();
    const fileHandle = handle(stream.writable);
    const showSaveFilePicker = vi.fn().mockResolvedValue(fileHandle);

    await expect(
      saveProjectWithFilePicker({
        html: "<main>Saved</main>",
        suggestedName: "member-cards.html",
        showSaveFilePicker,
      }),
    ).resolves.toBe(fileHandle);

    expect(showSaveFilePicker).toHaveBeenCalledWith({
      suggestedName: "member-cards.html",
      types: [
        {
          description: "HTML files",
          accept: { "text/html": [".html"] },
        },
      ],
    });
    expect(stream.write).toHaveBeenCalledTimes(1);
    const blob = stream.write.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/html;charset=utf-8");
    await expect(blob.text()).resolves.toBe("<main>Saved</main>");
    expect(stream.close).toHaveBeenCalledTimes(1);
  });

  it("reuses an existing handle without opening the picker", async () => {
    const stream = writable();
    const existingHandle = handle(stream.writable);
    const showSaveFilePicker = vi.fn();

    await expect(
      saveProjectWithFilePicker({
        html: "saved",
        suggestedName: "ignored.html",
        existingHandle,
        showSaveFilePicker,
      }),
    ).resolves.toBe(existingHandle);

    expect(showSaveFilePicker).not.toHaveBeenCalled();
    expect(existingHandle.createWritable).toHaveBeenCalledTimes(1);
  });

  it("waits for writing before closing and resolves after close", async () => {
    let finishWrite: (() => void) | undefined;
    let finishClose: (() => void) | undefined;
    const write = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
    );
    const close = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishClose = resolve;
        }),
    );
    const fileHandle = handle({ write, close });
    const save = saveProjectWithFilePicker({
      html: "saved",
      suggestedName: "project.html",
      showSaveFilePicker: vi.fn().mockResolvedValue(fileHandle),
    });

    await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    expect(close).not.toHaveBeenCalled();

    finishWrite?.();
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));

    let settled = false;
    void save.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    finishClose?.();
    await expect(save).resolves.toBe(fileHandle);
  });

  it("aborts after a write failure and preserves the write error", async () => {
    const writeError = new Error("write failed");
    const stream = writable({ write: vi.fn().mockRejectedValue(writeError) });
    const fileHandle = handle(stream.writable);

    await expect(
      saveProjectWithFilePicker({
        html: "saved",
        suggestedName: "project.html",
        showSaveFilePicker: vi.fn().mockResolvedValue(fileHandle),
      }),
    ).rejects.toBe(writeError);

    expect(stream.close).not.toHaveBeenCalled();
    expect(stream.abort).toHaveBeenCalledTimes(1);
  });

  it("aborts after a close failure and preserves the close error", async () => {
    const closeError = new Error("close failed");
    const stream = writable({ close: vi.fn().mockRejectedValue(closeError) });
    const fileHandle = handle(stream.writable);

    await expect(
      saveProjectWithFilePicker({
        html: "saved",
        suggestedName: "project.html",
        showSaveFilePicker: vi.fn().mockResolvedValue(fileHandle),
      }),
    ).rejects.toBe(closeError);

    expect(stream.write).toHaveBeenCalledTimes(1);
    expect(stream.abort).toHaveBeenCalledTimes(1);
  });

  it("keeps the original error when abort also fails", async () => {
    const writeError = new Error("write failed");
    const stream = writable({
      write: vi.fn().mockRejectedValue(writeError),
      abort: vi.fn().mockRejectedValue(new Error("abort failed")),
    });
    const fileHandle = handle(stream.writable);

    await expect(
      saveProjectWithFilePicker({
        html: "saved",
        suggestedName: "project.html",
        showSaveFilePicker: vi.fn().mockResolvedValue(fileHandle),
      }),
    ).rejects.toBe(writeError);
  });
});
