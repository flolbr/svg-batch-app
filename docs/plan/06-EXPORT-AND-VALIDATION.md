# 06 — Export and validation

## One validation pipeline

Preview and export use the same validation functions.

Validation levels:

- `error`: blocks normal export;
- `warning`: export allowed with acknowledgement;
- `info`: non-problematic note.

```ts
type ValidationIssue = {
  level: "error" | "warning" | "info";
  code: string;
  message: string;
  rowId?: string;
  mappingId?: string;
  targetId?: string;
  columnId?: string;
};
```

`validateRows` is the shared deterministic entry point. Preview passes its one
active row; export passes the selected rows in worksheet order. The pipeline
calls the same ordered mapping application for every row and returns:

```ts
type ValidationPipelineResult = {
  rows: {
    rowId: string;
    svg: SVGSVGElement;
    issues: ValidationIssue[];
  }[];
  projectIssues: ValidationIssue[];
  issues: ValidationIssue[];
  hasErrors: boolean;
};
```

Every row owns a separate SVG clone. Issues stay attached to their row and are
also flattened after the project issues in row order. `hasErrors` is the common
export gate. Mapping dependencies such as text measurement and image resolution
are supplied once and passed through for every row. Individual validation rules
are composed into this result; preview and export do not maintain separate
validators.

The caller supplies the active worksheet column IDs alongside the rows.
Mapping configuration is checked once per pipeline run. A missing column,
missing target, or target-incompatible mapping produces a project issue and is
excluded from row application so the same configuration failure is not
repeated for every row.

Row mapping issues retain their existing mapping, target, column, and row
context. This includes unknown visibility/group options, required blank values,
missing image or QR values, and text overflow. Each generated SVG is also
scanned after mapping; any `href` or `url(...)` reference that is neither a
local fragment nor embedded data is a blocking `external-resource` issue.

## Project-level validation

Check:

- SVG exists and parses;
- mapped columns exist;
- target IDs exist;
- target types are compatible;
- output filename rule is valid;
- selected rows exist;
- at least one output format is selected.

## Row-level validation

Check:

- required values;
- unknown group option;
- invalid boolean value;
- missing image asset;
- empty QR content;
- text overflow;
- invalid output filename;
- filename collision.

## Compact report

The action bar Validate control runs `validateRows` for the selected rows in
active-worksheet order. It is available after an SVG is loaded and at least one
row is selected.

The report shows:

- aggregate error, warning, and info counts;
- project issues grouped by level and issue code;
- only rows with issues, labelled by their worksheet position;
- expandable row sections grouped by level and issue code;
- repeated identical messages as one message with a count;
- an explicit success state when no issues are found.

The footer retains the latest issue count after the report closes. That result
is cleared when the accepted SVG, mappings, active columns, or selected rows
change so a stale result is never presented as current.

## Filename rules

Use one selected column or a small template such as:

```text
{Document ID}-{Name}
```

Do not implement a general expression language.

Sanitize:

- path separators;
- control characters;
- Windows-reserved characters;
- trailing dots/spaces;
- blank values;
- excessive length.

Collision policy:

- default: append `-2`, `-3`, etc.;
- optional: error.

Manifest records both requested and actual names.

Before export naming is resolved, `validateRows` can receive the requested
filename for each row. Duplicate detection compares NFC-normalized, trimmed,
case-insensitive names, ignores blanks, and emits a blocking
`duplicate-filename` issue for every row in a collision. Filename sanitation
and automatic suffix allocation remain part of the later filename-rules task.

## Export outputs

Required:

- individual SVG files;
- individual PDF files;
- optional selected-data CSV;
- `manifest.json`;
- ZIP when more than one file is produced.

Multipage PDF is deferred.

### Individual SVG

Export selected first runs the same `validateRows` call as the report. Blocking
errors open the report and produce no files.

For a valid selection, each mapped SVG clone is serialized in worksheet order
with a UTF-8 XML declaration and `image/svg+xml` MIME type. Exactly one file
uses the SVG browser download boundary, which creates and immediately revokes
its object URL; multiple files follow the ZIP rule below. Until the
filename-rules task is complete, requested names are
`row-{worksheet position}.svg`.

### Individual PDF

The action-bar format selector uses the same validation result and mapped SVG
clones as SVG export. PDF rows are processed sequentially with `svg2pdf.js` and
jsPDF. Each document uses point dimensions from the SVG's positive
`width`/`height` attributes, accepting unitless, `px`, or `pt` values, and
falls back to a positive `viewBox` size when explicit dimensions are absent.
An SVG without either valid source fails the export with a clear error.

Until filename rules are complete, requested PDF names are
`row-{worksheet position}.pdf`. The ZIP bundling rule below applies to multiple
PDFs.

### ZIP bundling

Exactly one generated SVG or PDF keeps its individual browser download. When
an export produces two or more files, JSZip writes them to
`svg-batch-export.zip` in worksheet order using their existing filenames and
exact text or binary contents. ZIP creation remains separate from the small
Blob/object-URL download boundary.

## Batch execution

Start sequentially:

```text
for each selected row:
  build effective row
  clone template
  apply mappings
  validate
  serialize SVG
  optionally create PDF
  append output to ZIP
  release row-specific objects
```

Add:

- progress count;
- current filename;
- cancel flag;
- continue-on-error;
- retry failed rows.

Do not add parallel workers until sequential export is shown to be too slow.

## PDF fidelity

Browser SVG preview and PDF output may differ.

Maintain representative fixture SVGs for:

- text;
- gradients;
- clipping;
- masks;
- embedded images;
- transforms;
- QR paths.

Export tests should confirm that a PDF is created and has the expected page size. Visual regression can be added later if needed.

## Fonts

For the MVP:

- use browser-available fonts or fonts bundled with the app;
- warn when the SVG requests an unavailable font;
- do not embed arbitrary local font files into the project automatically.

Never package font files in user-facing artifacts unless licensing and explicit requirements are clear.

## Export result

```ts
type ExportManifestEntry = {
  rowId: string;
  requestedFilename: string;
  actualFilename?: string;
  status: "success" | "failed" | "skipped";
  outputs: string[];
  warnings: string[];
  error?: string;
};
```
