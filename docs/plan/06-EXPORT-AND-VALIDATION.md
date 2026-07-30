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

## Export outputs

Required:

- individual SVG files;
- individual PDF files;
- optional selected-data CSV;
- `manifest.json`;
- ZIP when more than one file is produced.

Multipage PDF is deferred.

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
