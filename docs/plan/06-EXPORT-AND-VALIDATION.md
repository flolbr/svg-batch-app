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
with a UTF-8 XML declaration and `image/svg+xml` MIME type. Until the
filename-rules task is complete, requested names are
`row-{worksheet position}.svg`. The graphic files follow the ZIP rule below.

### Individual PDF

The action-bar format selector uses the same validation result and mapped SVG
clones as SVG export. PDF rows are processed sequentially with `svg2pdf.js` and
jsPDF. Each document uses point dimensions from the SVG's positive
`width`/`height` attributes, accepting unitless, `px`, or `pt` values, and
falls back to a positive `viewBox` size when explicit dimensions are absent.
An SVG without either valid source fails the export with a clear error.

Until filename rules are complete, requested PDF names are
`row-{worksheet position}.pdf`. The graphic files follow the ZIP rule below.

### ZIP bundling

JSZip writes generated files to `svg-batch-export.zip` in worksheet order using
their existing filenames and exact text or binary contents. Because every
completed export now includes `manifest.json`, the browser always receives one
archive. ZIP creation remains separate from the small Blob/object-URL download
boundary.

### Selected-data CSV

The action bar can optionally add `selected-data.csv` to the chosen SVG or PDF
outputs. Columns come from the active worksheet's export preferences in source
order. Rows are the selected effective rows in worksheet order, so imported
overrides and manual values are represented without mutating source data.

Headers use column display names and cells use displayed values. The UTF-8
output starts with a BOM, uses CRLF records with a final CRLF, and quotes
fields containing commas, quotes, or line breaks while doubling embedded
quotes. Because CSV accompanies a graphic output, enabling it uses the
multi-file ZIP path.

### Manifest

Every completed export appends `manifest.json` after the graphic files and
optional CSV. Its deterministic JSON array contains one entry per selected row
in worksheet order:

- `rowId`;
- the requested filename and actual filename;
- `success`, `failed`, or `skipped` status;
- generated output names;
- warning messages;
- an optional error.

Current successful exports use the same interim filename for requested and
actual names, list that row's SVG or PDF output, and retain row-level validation
warnings in issue order. Failed/skipped entries and error text are serialized
for the later progress/retry work rather than being produced prematurely.

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

- progress count and current filename while the sequential runner is active;
- cancellation between rows and before the final archive download;
- an explicit “Continue on errors (partial export)” choice;
- retry limited to failed row IDs with the original output settings.

Project-level validation errors always block export. Without the explicit
partial-export choice, any row validation error also opens the report and
produces no files. With it enabled, rows with validation errors become failed
manifest entries while valid rows continue.

Runtime conversion errors become failed entries. The default stops and marks
remaining rows skipped; continue-on-error attempts every row. Cancellation
marks unstarted rows skipped internally, discards completed files, and produces
no archive. Retry revalidates only failed rows against current data, SVG, and
mappings while retaining the failed batch's format and CSV choice.

Do not add parallel workers until sequential export is shown to be too slow.

## PDF fidelity

Browser SVG preview and PDF output may differ.

### Project-font PDF implementation (branch `experiment/project-embedded-font`)

Project font files remain user-selected project assets; each newly uploaded
face stores its actual family, style, and numeric weight from OpenType metadata.
Those fields are optional in the version-1 schema so existing saved projects
still load. Preview `@font-face` rules are family-specific instead of naming
every file Ethnocentric.

For an automated PDF, `src/export/pdfExport.ts` creates a same-origin rendering
iframe, verifies the supplied font faces loaded, and asks `opentype.js` for
glyph paths for SVG text using those faces. The paths are generated only on the
row's export clone; the accepted template and saved project are unchanged.
`svg2pdf.js` renders those outlines with the remaining SVG graphics. jsPDF
stream compression is enabled, which matters for this template's large
embedded PNGs. SVG text without a supplied project face keeps the existing
converter behavior. If a supplied-font text run has unsupported geometry or
cannot be matched to a parseable face, export fails visibly rather than
silently substituting or misplacing the text.

The PDF text is vector-sharp and independent of installed fonts, but it is
outlined: it is not selectable or searchable as text. The current outline path
supports a single non-empty horizontal run per `<text>`, inherited or numeric
`x`/`y`, `dx`/`dy`, `text-anchor`, parent transforms, font size, kerning, and
accented glyphs. Multiple non-empty runs in one text element, vertical writing,
`textLength`/`lengthAdjust`, and per-glyph rotation are not supported yet and
produce a clear export error. WOFF2 can preview in browsers, but this parser
cannot outline a matching WOFF2 face; use OTF, TTF, or WOFF for sharp PDF text.
SVG export still does not package project font bytes and is not independently
portable when it depends on that font.

Sénior's image transparency is supplied by SVG grayscale masks and color-matrix
filters, not by PNG alpha. The converter does not reproduce those masks.
PDF export now composites only masked subtrees containing groups and images
into transparent PNGs at 300 DPI, accounting for their SVG transforms. Each
replacement stays in the same drawing position/order; text outlines and the
remaining SVG retain vector conversion. Standard PNG alpha passes through
unchanged. Input SVGs and saved project assets are never modified.

Masked subtrees containing vector artwork or text fail visibly instead of
rasterizing that content. Invalid embedded image data also fails visibly.
The browser regression covers ordinary alpha, opaque artwork with a grayscale
mask/color-matrix filter, group opacity, vector glyphs, source immutability,
and invalid/unsupported cases. For repeatable rendered-pixel checks with
Poppler available, run `SVG_BATCH_PDF_RENDER_CHECK=1 bun run test:browser:pdf`.

Verified acceptance fixture: sanitized/mapped `Sénior.svg` with the supplied
Ethnocentric OTF. The current PDF is one 1123 × 794 pt page, about 2.95 MB;
masked artwork is 300 DPI and headline outlines remain sharp at 400 DPI.
A repeatable Chromium regression also checks distinct mapped row values.

Relevant tests: `bun run test -- src/export/projectFontOutlines.test.ts
src/export/pdfExport.test.ts src/SvgPreview.test.tsx
src/project/projectSchema.test.ts src/App.test.tsx`,
`bun run test:browser:pdf`, and `bun run check`. Keep `outputs/` and existing
downloads untouched.

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
