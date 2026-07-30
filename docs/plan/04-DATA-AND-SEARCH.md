# 04 — Data and search

## Internal model

```ts
type ColumnId = string;
type RowId = string;

type DataColumn = {
  id: ColumnId;
  sourceHeader: string;
  displayName: string;
  sourceIndex: number;
  inferredType: "text" | "number" | "date" | "boolean" | "mixed";
};

type CellValue = string | number | boolean | null;

type SourceRow = {
  id: RowId;
  values: Record<ColumnId, CellValue>;
  displayedValues: Record<ColumnId, string>;
};

type ManualRow = {
  id: RowId;
  values: Record<ColumnId, CellValue>;
};

type RowOverride = {
  rowId: RowId;
  values: Partial<Record<ColumnId, CellValue>>;
};
```

Use displayed values for direct text mappings by default. Preserve typed values for sorting and filters.

The selected worksheet is normalized when it is imported or changed. Keep the
result in source state so React rendering, sorting, and filtering do not
regenerate row IDs.

## Header normalization

On import:

1. strip a UTF-8 BOM before reading the first header;
2. trim headers;
3. replace blank headers with `Column 1`, `Column 2`, etc.;
4. keep duplicate display names but generate unique IDs;
5. never use the header string as the persistent column ID.

Example:

```text
Name
Name
(blank)
```

becomes IDs:

```text
col-0
col-1
col-2
```

with display names:

```text
Name
Name (2)
Column 3
```

## Stable row IDs

Generate IDs at import and persist them in the project snapshot.

Do not use current table position because filtering, sorting, and manual insertion change it.

## Effective row

```ts
function getEffectiveRow(
  source: SourceRow | undefined,
  manual: ManualRow | undefined,
  override: RowOverride | undefined,
): Record<ColumnId, CellValue>;
```

A row is either source or manual. Overrides apply only to source rows.

## Search

Fuse.js indexes effective displayed row values.

Create one search document per row:

```ts
type SearchDocument = {
  rowId: RowId;
  all: string;
  byColumn: Record<ColumnId, string>;
};
```

Normalize:

- lower case;
- Unicode NFD;
- remove combining accents;
- collapse whitespace.

Rebuild the search index only when source data, manual rows, or overrides change. Do not rebuild on every keystroke.

Use a debounced query of roughly 100–200 ms.

Default multi-term behavior: all terms must match somewhere in the selected scope.

## Structured filters

Represent filters as data, not functions, so they can be persisted.

```ts
type ColumnFilter =
  | { type: "values"; columnId: ColumnId; included: string[] }
  | { type: "text"; columnId: ColumnId; operator: "contains" | "equals"; value: string }
  | { type: "number"; columnId: ColumnId; min?: number; max?: number }
  | { type: "date"; columnId: ColumnId; from?: string; to?: string }
  | { type: "blank"; columnId: ColumnId; blank: boolean };
```

Final matching rows are:

```text
fuzzy search match
AND every structured filter
```

## Selection

Persist `selectedRowIds` separately from matching rows.

Commands:

- select one row;
- toggle one row;
- select all matching;
- select visible page;
- clear matching selection;
- clear all.

The header checkbox must communicate:

- none selected;
- all visible selected;
- some visible selected.

## Manual rows

`+ Add row` creates a blank manual row and enters edit mode.

Support:

- tab between cells;
- enter to commit;
- paste tab/newline-delimited values;
- duplicate row;
- delete manual row.

Do not implement a full spreadsheet editor.

## Selected columns

Persist separately:

```ts
type ColumnPreferences = {
  visible: ColumnId[];
  searchable: ColumnId[];
  exported: ColumnId[];
};
```

All imported columns remain mappable unless intentionally disabled because of unsupported data.

## Workbook snapshot

For a self-contained project, persist normalized data rather than the binary workbook.

Optional source metadata:

- file name;
- sheet name;
- imported date;
- file hash;
- Drive file ID when applicable.

This avoids embedding large XLSX binaries in the project HTML.

## Local import boundary

The local file control accepts CSV, XLSX, and XLS files. SheetJS parses the
selected file into the transient source state and exposes its worksheet names.
CSV values are parsed as raw text so date-like strings and leading zeroes are
not coerced before normalization.
The first worksheet is selected by default, and the user can choose another
worksheet before normalization. Single-worksheet files show the selection but
do not offer an unnecessary choice. The workbook binary is not added to
persisted project data.
