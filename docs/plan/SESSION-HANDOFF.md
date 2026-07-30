# Session handoff

Last updated: 2026-07-30

## Current task

No implementation task is active. Thresholded row virtualization is complete.

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
- Manual-row controls remain disabled until their dedicated Phase 2 item.
- `docs/examples/membership-demo/` is the canonical end-to-end fixture for
  spreadsheet, SVG, mapping, search, selection, filename, and export flows.
- The fixture includes matching CSV/XLSX customer data, a secondary worksheet,
  a safe SVG, expected mapping intent, and verified checksums.

## What remains

Fuzzy row-value search and the rest of the spreadsheet workflow remain Phase 2
work.

## Next concrete step

Start the next `Phase 2 — Spreadsheet import and grid` item in `00-TODO.md`:

1. mark fuzzy row-value search `[-]`;
2. implement normalized multi-term search across all or selected columns;
3. keep search results compatible with the existing virtualized row model.

## Files changed

- `src/App.tsx`
- `src/App.test.tsx`
- `src/styles.css`
- `docs/plan/00-TODO.md`
- `docs/plan/04-DATA-AND-SEARCH.md`
- `docs/plan/SESSION-HANDOFF.md`

## Tests run

- `bun run test -- src/App.test.tsx`
- `bun run check`

## Latest substantive commit

`b2fd665 feat: render normalized spreadsheet grid`
