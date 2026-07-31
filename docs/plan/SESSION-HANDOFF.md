# Session handoff

Last updated: 2026-07-31

## Current task

No implementation task is active. Phase 4 mapping application is complete.

## What works

- Desktop header and fixed-ratio Data, SVG Objects, and Preview panels.
- Persistent bottom action bar with the primary project actions.
- Static empty and sample states that establish the intended UI density.
- Responsive layout below 1100 px with Preview first and a sticky action bar.
- Accessible headings and labelled project action region.
- Shared Mantine brand palette, typography, and radius defaults.
- Shared shell variables for neutral surfaces, borders, text, blue accents, and
  panel shadow.
- Top-level render failures show an accessible reload fallback.
- Mantine notifications are mounted at the top right for later import, save,
  and recoverable-error feedback.
- Desktop users can drag the compact six-dot panel grips or adjust them with the
  left and right arrow keys.
- Panel minimum widths are preserved, and resize controls are hidden in the
  responsive stacked layout.
- Zustand now owns project, UI, source, and selection slices.
- The existing desktop panel weights and resize updates use the UI slice.
- Project and source slices start explicitly empty; row and SVG object
  selections start empty and remain separate from UI state.
- Startup reads the inert `#svg-batch-project` JSON block and validates the
  current version-1 project identity with Zod.
- Valid project identity is loaded into Zustand. Missing, malformed,
  unsupported, incomplete, or unexpectedly shaped data is not partially loaded
  and produces a persistent error notification.
- The Data panel accepts local CSV, XLSX, and XLS files and reports import
  failures through the notification surface.
- SheetJS keeps the parsed workbook and its worksheet names in transient source
  state. The selected workbook is not persisted.
- A newly imported workbook selects its first worksheet by default.
- Multi-worksheet files provide an accessible selector backed by transient
  Zustand state; single-worksheet files show a disabled selector.
- Every worksheet is normalized into explicit columns and immutable source
  rows when a workbook is imported.
- Headers handle BOMs, whitespace, blanks, and duplicates. Cells retain typed
  values and formatted display strings, including date and leading-zero
  formatting.
- Row IDs are generated independently from table position. Normalized
  worksheets are retained in validated project data so IDs remain stable
  across worksheet switches and project reloads.
- TanStack Table renders normalized worksheet headers and displayed cell values.
- The grid uses each generated source row ID as its TanStack identity and
  updates when the selected worksheet changes.
- Empty sources and worksheets show an explicit message instead of sample data.
- Worksheets with up to 200 rows keep the ordinary TanStack Table rendering
  path; larger worksheets use TanStack Virtual.
- The virtual grid mounts only the viewport plus eight overscan rows, keeps
  headers sticky, exposes logical row counts/indexes, and supports keyboard
  focus and scrolling through the full result set.
- Fuse indexes normalized displayed values when worksheet data changes.
- Search is debounced by 150 ms, ignores case and accents, tolerates fuzzy
  typos, and requires every query term to match.
- Users can search across all values or one selected normalized column.
- Matching rows retain source order and feed the existing table and
  virtualization paths; the footer reports matching and total counts.
- Users can apply one structured filter per column through a Mantine popover:
  distinct displayed values, normalized text contains/equals, inclusive
  typed-number and typed-date ranges, or blank/non-blank displayed values.
- Multiple column filters combine with each other and fuzzy search using AND
  semantics. Filtered rows retain source order and use the existing ordinary
  and virtualized table paths.
- Active filters can be removed individually or cleared together. Filters are
  scoped to and persisted with their worksheet.
- Each rendered row has a leading checkbox backed by its stable row ID in the
  Zustand selection slice.
- Search and structured filters only change which rows are visible. Hidden
  selected rows remain selected, reappear checked when filters are removed,
  and remain included in the action-bar selected count.
- The data toolbar can select all matching rows, select the current visible
  range, or clear the full selection. Adding rows preserves existing hidden
  selections.
- The grid header checkbox selects or clears the visible range and communicates
  none, some, and all-selected states. The ordinary grid treats all displayed
  results as visible; the virtualized grid uses its current viewport range.
- The final Add row control creates a stable-ID blank manual row for the
  selected worksheet, clears active search/filters, and focuses its first cell.
- Manual cells save as typed, support Tab navigation and Enter-to-finish, and
  accept tab/newline-delimited paste that can append rows.
- Manual rows can be duplicated or deleted, carry a visible Manual marker, and
  remain separate from immutable imported rows. They participate in search,
  filters, virtualization, selection, and counts.
- Manual rows are persisted with their worksheet.
- Imported rows expose an explicit Edit action. Changes are stored as
  worksheet-scoped overrides and merged only in the effective-row pipeline;
  normalized source rows remain unchanged.
- Modified imported rows carry a visible marker and reset action. Returning
  cells to their original displayed values removes their overrides.
- Effective imported values participate in search, structured filters,
  virtualization, selection, and counts. Numeric display edits retain their
  entered form while exposing typed numbers to range filters.
- Imported-row overrides are persisted with their worksheet.
- The Columns popover exposes independent Visible and Export checkboxes for
  every imported column. Both preferences default to all columns.
- Column preferences are scoped to each worksheet and survive worksheet
  switches while the imported workbook remains loaded.
- Visibility only changes the rendered grid. Hidden columns remain available
  to fuzzy search, structured filters, and future mappings.
- Export selections are recorded for the future export flow. Column
  preferences are persisted with their worksheet.
- Selected row IDs are scoped to each worksheet, persisted independently from
  filtering, and restored when switching worksheets or loading project data.
- The optional Phase 2 project data block is validated with Zod and contains
  every normalized worksheet plus its selections, filters, overrides, manual
  rows, and column preferences.
- Loading project data reconstructs the complete spreadsheet runtime without
  the original SheetJS workbook. The workbook object remains transient.
- The SVG panel accepts local `.svg` files and reports import success or failure
  through the existing notification surface.
- SVG input is parsed as XML and rejected when malformed, rooted outside the
  SVG namespace, or using unsupported elements, event handlers, unsafe links,
  or external resources.
- DOMPurify sanitizes the supported subset, which is validated again before
  the accepted SVG string enters transient source state. The UI exposes the
  source filename and sanitized status.
- Imported SVG IDs must be non-empty and globally unique, and local fragment
  links must resolve to an existing ID.
- ID-bearing groups, text, shapes, images, and `use` elements become mapping
  targets in document order. Resource containers and their descendants remain
  excluded, and templates without targets are rejected.
- Accepted source state includes the validated target list; the SVG panel
  reports its mapping-target count.
- Accepted source state also includes a read-only object tree in document
  order, nested beneath the nearest addressable ancestor through non-target
  wrappers.
- Object labels prefer retained Inkscape layer metadata, `aria-label`, direct
  child `title`, ID, then tag name. The SVG panel renders the hierarchy as a
  compact nested list.
- The SVG object tree exposes semantic tree, treeitem, and group roles with
  roving focus, expansion controls, single selection, and
  `aria-expanded`/`aria-selected` state.
- Up/Down navigate visible objects, Right expands or enters a branch, Left
  collapses or returns to the parent, and Enter selects.
- Object search is case- and accent-insensitive and preserves matching ancestor
  context. Each object exposes an Unmapped status until mapping state exists.
- SVG-object selection is stored independently in Zustand, drives the mapping
  summary, and resets when a replacement SVG is accepted.
- The accepted SVG renders live inside an empty-capability sandboxed `srcDoc`
  iframe. Imported markup never enters the parent application DOM.
- The isolated preview centers and contains the SVG, ignores pointer
  interaction, and replaces its document when a new template is accepted.
- Selecting an SVG object adds a preview-only marker with a blue outline and
  drop shadow inside the sandboxed iframe. Changing selection moves the marker,
  while the accepted SVG snapshot remains unchanged.
- Preview Previous/Next controls navigate selected rows in active-worksheet
  order and expose the current position. Selected rows hidden by search or
  filters remain navigable.
- The active preview row stays within the current selection, falls back to the
  first selected row when necessary, and reconciles across worksheet changes.
- Preview zoom changes the iframe-only presentation from 25% to 200% in 25%
  steps. Fit restores the contained 100% view, and neither operation changes
  accepted SVG markup or selected-target highlighting.
- The SVG panel exposes typed Embedded, Linked, Drive, Unavailable, and
  Modified source badges. Local imports are Embedded, absence is Unavailable,
  and unfinished linked/Drive adapters remain disabled.
- Strict Zod schemas define text, visibility, exclusive-group, QR, and image
  mappings through one discriminated union. Shared IDs are trimmed/non-empty,
  unknown keys are rejected, and immediate numeric bounds are validated.
- Direct text mapping updates `text` or `tspan` content on a caller-owned SVG
  clone using displayed row values. Missing data/targets, incompatible tags,
  and required blanks return structured issues without throwing or mutating
  the accepted template.
- Visibility mapping normalizes configured and row values, applies direct
  `display` show/hide changes on the clone, and reports missing, required,
  empty, unknown, or ambiguous values without throwing.
- Exclusive group mapping considers direct children only, prefers
  `data-option` with ID fallback, supports explicit ID mode, and preserves
  non-candidates/nested descendants. Error paths do not partially hide
  options.
- QR mapping derives bounds from a target group's first direct rectangle,
  centers a square matrix with configured margin/error correction, and
  replaces placeholder children with crisp white/black vector geometry.
  Invalid or failed generation leaves the placeholder unchanged.
- Image mapping updates bounded `<image>` targets with contain, cover, or
  stretch fit while preserving geometry. Direct values accept embedded raster
  data only; an explicit validated resolver boundary supports later
  local/Drive/HTTPS assets without enabling those adapters now.
- Text mappings support keep, shrink, truncate, and validation-error fitting.
  Measurement is injected for deterministic preview/export reuse; shrink
  respects minimum font size, and truncation is Unicode-safe.
- Selecting an SVG object exposes a controlled Mantine mapping editor with
  target-compatible mapping types, all active-worksheet source columns,
  required state, type-specific options, inline schema feedback, and removal.
- Runtime mappings are one-per-target in Zustand. Mapping type changes preserve
  shared fields, worksheet changes retain mappings for later validation, and
  replacing the SVG clears mappings tied to the previous template.
- The SVG tree and mapping editor share one pure configuration-status
  derivation. Targets show Unmapped, Mapped, Warning for an unavailable
  active-sheet column, or Error for invalid and target-incompatible mappings.
- Tree status badges expose visible text, distinct colors, compact decorative
  symbols, and title text with the exact explanation without coupling the tree
  to Zustand.
- `applyMappings` deep-clones the accepted SVG element and applies exclusive
  group, visibility, text, image, and QR mappings in documented order.
- Mapping application preserves input order within each type, injects text
  metrics and image resolution, aggregates issues without stopping, and never
  mutates the accepted template.
- `docs/examples/membership-demo/` is the canonical end-to-end fixture for
  spreadsheet, SVG, mapping, search, selection, filename, and export flows.
- The fixture includes matching CSV/XLSX customer data, a secondary worksheet,
  a safe SVG, expected mapping intent, and verified checksums.

## What remains

Phase 4 is complete. The shared Phase 5 validation pipeline is next.

## Next concrete step

Continue `Phase 5 — Validation and export` in `00-TODO.md`:

1. read `docs/plan/06-VALIDATION-AND-EXPORT.md`;
2. mark “Build one validation pipeline shared by preview and export” `[-]`;
3. compose configuration and row-level mapping issues around `applyMappings`
   without creating separate preview/export validators.

## Files changed

- `src/mappings/applyMappings.ts`
- `src/mappings/applyMappings.test.ts`
- `docs/plan/00-TODO.md`
- `docs/plan/05-SVG-AND-MAPPINGS.md`
- `docs/plan/SESSION-HANDOFF.md`

## Tests run

- `bun run test -- src/mappings/applyMappings.test.ts`
- `bunx tsc -b`
- `bun run check`

## Latest substantive commit

Pending `feat: orchestrate mapping application`
