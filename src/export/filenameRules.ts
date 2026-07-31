import type { DataColumn, SourceRow } from "../data/normalizeWorkbook";
import type { ValidationIssue } from "../mappings/validation";
import { validateDuplicateFilenames } from "../validation/filenameValidation";

export type FilenameCollisionPolicy = "suffix" | "error";

export type ExportFilenameEntry = {
  rowId: string;
  requestedFilename: string;
  actualFilename: string;
};

type ResolveExportFilenamesOptions = {
  rows: readonly SourceRow[];
  columns: readonly DataColumn[];
  rowNumbers: ReadonlyMap<string, number>;
  template: string;
  extension: string;
  collisionPolicy: FilenameCollisionPolicy;
};

type TemplatePart =
  | { type: "text"; value: string }
  | { type: "row" }
  | { type: "column"; id: string };

const maxFilenameLength = 180;
const unsafeFilenameCharacters = /[\\/\x00-\x1f\x7f<>:"|?*]+/g;
const deviceName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?=\.|$)/i;

function templateIssue(message: string): ValidationIssue {
  return { level: "error", code: "invalid-filename-template", message };
}

function parseTemplate(
  template: string,
  columns: readonly DataColumn[],
): { parts: TemplatePart[]; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const columnIdsByName = new Map(
    columns.map((column) => [column.displayName, column.id]),
  );
  const parts: TemplatePart[] = [];
  const unknownTokens = new Set<string>();

  if (template.trim() === "") {
    return {
      parts: [{ type: "text", value: template }],
      issues: [templateIssue("Filename template cannot be blank.")],
    };
  }

  let textStart = 0;
  for (let index = 0; index < template.length; index += 1) {
    const character = template[index];
    if (character === "}") {
      issues.push(
        templateIssue("Filename template has an unmatched closing brace."),
      );
      continue;
    }
    if (character !== "{") continue;

    const closingIndex = template.indexOf("}", index + 1);
    if (closingIndex === -1) {
      issues.push(
        templateIssue("Filename template has an unmatched opening brace."),
      );
      if (textStart < index) {
        parts.push({ type: "text", value: template.slice(textStart, index) });
      }
      parts.push({ type: "text", value: template.slice(index) });
      textStart = template.length;
      break;
    }

    if (textStart < index) {
      parts.push({ type: "text", value: template.slice(textStart, index) });
    }
    const token = template.slice(index + 1, closingIndex);
    if (token.includes("{")) {
      issues.push(
        templateIssue("Filename template cannot contain nested braces."),
      );
    } else if (token === "row") {
      parts.push({ type: "row" });
    } else {
      const columnId = columnIdsByName.get(token);
      if (columnId) parts.push({ type: "column", id: columnId });
      else if (!unknownTokens.has(token)) {
        unknownTokens.add(token);
        issues.push(templateIssue(`Unknown filename placeholder "${token}".`));
      }
    }
    index = closingIndex;
    textStart = closingIndex + 1;
  }

  if (textStart < template.length) {
    parts.push({ type: "text", value: template.slice(textStart) });
  }
  return { parts, issues };
}

function renderTemplate(
  parts: readonly TemplatePart[],
  row: SourceRow,
  rowNumber: number,
): string {
  return parts
    .map((part) => {
      if (part.type === "text") return part.value;
      if (part.type === "row") return String(rowNumber);
      return row.displayedValues[part.id] ?? "";
    })
    .join("");
}

function codePoints(value: string): string[] {
  return Array.from(value);
}

function limitBase(base: string, extension: string, suffix = ""): string {
  const available = Math.max(
    0,
    maxFilenameLength -
      1 -
      codePoints(extension).length -
      codePoints(suffix).length,
  );
  const limited = codePoints(base)
    .slice(0, available)
    .join("")
    .replace(/[.\s]+$/u, "");
  if (limited) return limited;
  return codePoints("untitled").slice(0, available).join("");
}

function sanitizeBase(base: string, extension: string): string {
  let sanitized = base
    .normalize("NFC")
    .replace(unsafeFilenameCharacters, "-")
    .trim()
    .replace(/[.\s]+$/u, "");
  if (!sanitized) sanitized = "untitled";
  if (deviceName.test(sanitized)) {
    sanitized = sanitized.replace(deviceName, "$1-file");
  }
  return limitBase(sanitized, extension);
}

function filenameKey(filename: string): string {
  return filename.normalize("NFC").trim().toLocaleLowerCase();
}

function withSuffix(base: string, extension: string, suffix: string): string {
  return `${limitBase(base, extension, suffix)}${suffix}.${extension}`;
}

export function resolveExportFilenames({
  rows,
  columns,
  rowNumbers,
  template,
  extension,
  collisionPolicy,
}: ResolveExportFilenamesOptions): {
  entries: ExportFilenameEntry[];
  issues: ValidationIssue[];
} {
  const parsed = parseTemplate(template, columns);
  const requested = rows.map((row) => {
    const base = renderTemplate(parsed.parts, row, rowNumbers.get(row.id) ?? 0);
    return {
      rowId: row.id,
      requestedFilename: `${base}.${extension}`,
      base: sanitizeBase(base, extension),
    };
  });
  const candidates = requested.map((entry) => `${entry.base}.${extension}`);

  if (collisionPolicy === "error") {
    return {
      entries: requested.map((entry, index) => ({
        rowId: entry.rowId,
        requestedFilename: entry.requestedFilename,
        actualFilename: candidates[index],
      })),
      issues: [
        ...parsed.issues,
        ...validateDuplicateFilenames(
          requested.map((entry, index) => ({
            rowId: entry.rowId,
            filename: candidates[index],
          })),
        ),
      ],
    };
  }

  const reserved = new Set(candidates.map(filenameKey));
  const used = new Set<string>();
  const entries = requested.map((entry, index) => {
    let actualFilename = candidates[index];
    let suffixNumber = 2;
    while (used.has(filenameKey(actualFilename))) {
      actualFilename = withSuffix(entry.base, extension, `-${suffixNumber}`);
      suffixNumber += 1;
    }
    while (
      reserved.has(filenameKey(actualFilename)) &&
      actualFilename !== candidates[index]
    ) {
      actualFilename = withSuffix(entry.base, extension, `-${suffixNumber}`);
      suffixNumber += 1;
    }
    used.add(filenameKey(actualFilename));
    return {
      rowId: entry.rowId,
      requestedFilename: entry.requestedFilename,
      actualFilename,
    };
  });

  return { entries, issues: parsed.issues };
}
