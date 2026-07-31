import type { ExportManifestEntry } from "./manifestExport";

export type ExportBatchItem<TFile extends { filename: string }> = {
  rowId: string;
  requestedFilename: string;
  warnings: readonly string[];
  errors: readonly string[];
  createFile: () => Promise<TFile>;
};

export type ExportBatchProgress = {
  completed: number;
  total: number;
  currentFilename: string | null;
};

export type RunExportBatchOptions = {
  continueOnError: boolean;
  isCancelled: () => boolean;
  onProgress: (progress: ExportBatchProgress) => void;
  yieldControl?: () => Promise<void>;
};

export type ExportBatchResult<TFile extends { filename: string }> = {
  files: TFile[];
  entries: ExportManifestEntry[];
  failedRowIds: string[];
  cancelled: boolean;
};

const cancellationReason = "Skipped because export was cancelled.";
const stoppedReason = "Skipped because a previous export failed.";
const unknownError = "The export file could not be created.";

function defaultYieldControl(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : unknownError;
}

export async function runExportBatch<TFile extends { filename: string }>(
  items: readonly ExportBatchItem<TFile>[],
  options: RunExportBatchOptions,
): Promise<ExportBatchResult<TFile>> {
  const files: TFile[] = [];
  const entries: ExportManifestEntry[] = [];
  const failedRowIds: string[] = [];
  const total = items.length;
  const yieldControl = options.yieldControl ?? defaultYieldControl;
  let completed = 0;
  let cancelled = false;

  options.onProgress({ completed, total, currentFilename: null });

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (options.isCancelled()) {
      cancelled = true;
      for (const skipped of items.slice(index)) {
        entries.push({
          rowId: skipped.rowId,
          requestedFilename: skipped.requestedFilename,
          status: "skipped",
          outputs: [],
          warnings: [...skipped.warnings],
          error: cancellationReason,
        });
      }
      completed = total;
      options.onProgress({ completed, total, currentFilename: null });
      break;
    }

    options.onProgress({
      completed,
      total,
      currentFilename: item.requestedFilename,
    });

    if (item.errors.length > 0) {
      entries.push({
        rowId: item.rowId,
        requestedFilename: item.requestedFilename,
        status: "failed",
        outputs: [],
        warnings: [...item.warnings],
        error: item.errors[0],
      });
      failedRowIds.push(item.rowId);
    } else {
      try {
        const file = await item.createFile();
        files.push(file);
        entries.push({
          rowId: item.rowId,
          requestedFilename: item.requestedFilename,
          actualFilename: file.filename,
          status: "success",
          outputs: [file.filename],
          warnings: [...item.warnings],
        });
      } catch (error) {
        entries.push({
          rowId: item.rowId,
          requestedFilename: item.requestedFilename,
          status: "failed",
          outputs: [],
          warnings: [...item.warnings],
          error: errorMessage(error),
        });
        failedRowIds.push(item.rowId);
      }
    }

    completed += 1;
    options.onProgress({ completed, total, currentFilename: null });

    if (entries.at(-1)?.status === "failed" && !options.continueOnError) {
      for (const skipped of items.slice(index + 1)) {
        entries.push({
          rowId: skipped.rowId,
          requestedFilename: skipped.requestedFilename,
          status: "skipped",
          outputs: [],
          warnings: [...skipped.warnings],
          error: stoppedReason,
        });
      }
      completed = total;
      options.onProgress({ completed, total, currentFilename: null });
      break;
    }

    await yieldControl();
  }

  return { files, entries, failedRowIds, cancelled };
}
