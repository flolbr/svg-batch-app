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

## Grid rendering

TanStack Table renders the selected worksheet's normalized columns and source
rows. Cells use `displayedValues`, while the typed `values` remain available for
later sorting and filters. TanStack row identity uses the generated source row
ID rather than the current table position.

Rows up to and including 200 use the ordinary table path. Larger result sets
use TanStack Virtual with 40 px rows, eight overscan rows, stable source row
keys, and a scroll viewport capped at 400 px. The virtual table reports its
logical row count and logical row indexes for assistive technology, while the
scroll region remains keyboard focusable.

Empty imports and worksheets show an explicit empty state. Row selection and
manual-row controls remain separate follow-up items.

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

Fuse.js indexes effective displayed row values. The current source-row
implementation builds the all-values and per-column indexes only when the
normalized worksheet data changes. Manual rows and overrides join the same
index when their dedicated items are implemented.

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

The data panel debounces queries by 150 ms. Search results retain source order,
feed TanStack Table before the virtualization threshold is evaluated, and show
matching and total row counts.

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

The data panel provides one active filter per column. It supports distinct
displayed values, normalized text contains/equals, inclusive typed-number and
typed-date ranges, and blank/non-blank displayed values. Multiple column
filters use AND semantics, retain source order, and feed the same ordinary or
virtualized table path as search results.

Filters remain transient until the dedicated Phase 2 persistence item.

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

Each rendered source row has a leading checkbox that toggles its stable row ID
in the Zustand selection slice. Search and structured filters only determine
which rows are rendered; they never remove hidden IDs from the selection. The
action bar reports the full selected count, including rows hidden by the
current search or filters.

The selection toolbar can add every matching row, add the current visible
range, or clear the full selection. Existing hidden selections are preserved
when rows are added. For the virtualized grid, the visible range is the
current viewport; for the ordinary grid, it is the full displayed result set.

The header checkbox targets that same visible range. It is unchecked when none
are selected, indeterminate when some are selected, checked when all are
selected, and disabled when the range is empty. Clearing an all-selected
header removes only the visible IDs, preserving selections outside the range.

## Manual rows

`+ Add row` creates a blank manual row and enters edit mode.

Support:

- tab between cells;
- enter to commit;
- paste tab/newline-delimited values;
- duplicate row;
- delete manual row.

Do not implement a full spreadsheet editor.

Manual rows are stored separately from immutable imported rows and grouped by
worksheet. Each receives a generated stable row ID and a value entry for every
normalized column. The effective table appends them after source rows and
converts their display strings into the existing `SourceRow` boundary so
search, structured filters, virtualization, selection, and counts use one
pipeline. Numeric strings in inferred-number columns provide typed numeric
values while preserving the entered display string.

Manual cells save as they are typed. Tab follows the native cell-input order
and Enter finishes the current cell by moving focus out of it. Pasting
tab/newline-delimited text fills cells from the paste origin and appends manual
rows when necessary. Manual-row actions duplicate beside the original or
delete the target; deletion also removes that row ID from selection.

Manual rows remain transient until the dedicated Phase 2 persistence item.

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
