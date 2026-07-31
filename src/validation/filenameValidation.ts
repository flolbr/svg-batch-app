import type { ValidationIssue } from "../mappings/validation";

export type RequestedFilename = {
  rowId: string;
  filename: string;
};

function collisionKey(filename: string): string {
  return filename.normalize("NFC").trim().toLocaleLowerCase();
}

export function validateDuplicateFilenames(
  entries: readonly RequestedFilename[],
): ValidationIssue[] {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    const key = collisionKey(entry.filename);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return entries.flatMap((entry) => {
    const key = collisionKey(entry.filename);
    if (!key || (counts.get(key) ?? 0) < 2) return [];

    const filename = entry.filename.trim();
    return [
      {
        level: "error",
        code: "duplicate-filename",
        rowId: entry.rowId,
        message: `Filename "${filename}" is requested by multiple rows.`,
      },
    ];
  });
}
