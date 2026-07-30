# Session handoff

Last updated: 2026-07-30

## Current task

No implementation task is active. Excel-style per-column filters are complete.

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
- The selected worksheet is normalized into explicit columns and immutable
  source rows when imported or changed.
- Headers handle BOMs, whitespace, blanks, and duplicates. Cells retain typed
  values and formatted display strings, including date and leading-zero
  formatting.
- Row IDs are generated independently from table position and remain stable
  while the selected worksheet stays active.
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
- Active filters can be removed individually or cleared together. Filters
  reset when the imported worksheet data changes and remain transient until
  the dedicated persistence item.
- Manual-row controls remain disabled until their dedicated Phase 2 item.
- `docs/examples/membership-demo/` is the canonical end-to-end fixture for
  spreadsheet, SVG, mapping, search, selection, filename, and export flows.
- The fixture includes matching CSV/XLSX customer data, a secondary worksheet,
  a safe SVG, expected mapping intent, and verified checksums.

## What remains

Row-selection behavior and the rest of the spreadsheet workflow remain Phase 2
work.

## Next concrete step

Start the next `Phase 2 — Spreadsheet import and grid` item in `00-TODO.md`:

1. mark “Keep filtering and row selection independent” `[-]`;
2. add row selection state and controls without deriving it from matching rows;
3. verify selected rows remain selected when search or filters hide them.

## Files changed

- `src/App.tsx`
- `src/App.test.tsx`
- `src/ColumnFilters.tsx`
- `src/data/filterRows.ts`
- `src/data/filterRows.test.ts`
- `docs/plan/00-TODO.md`
- `docs/plan/04-DATA-AND-SEARCH.md`
- `docs/plan/SESSION-HANDOFF.md`

## Tests run

- `bun run test -- src/App.test.tsx`
- `bun run test -- src/data/filterRows.test.ts src/data/searchRows.test.ts src/App.test.tsx`
- `bun run lint`
- `bun run build:single`
- `bun run check`

## Latest substantive commit

Pending commit for Excel-style per-column filters.
