# Session handoff

Last updated: 2026-07-30

## Current task

No implementation task is active. Local CSV, XLSX, and XLS import is complete.

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
- `docs/examples/membership-demo/` is the canonical end-to-end fixture for
  spreadsheet, SVG, mapping, search, selection, filename, and export flows.
- The fixture includes matching CSV/XLSX customer data, a secondary worksheet,
  a safe SVG, expected mapping intent, and verified checksums.

## What remains

Worksheet selection, row normalization, and the rest of the spreadsheet grid
remain Phase 2 work. The existing sample grid is still static until those items
replace it with imported rows.

## Next concrete step

Start the next `Phase 2 — Spreadsheet import and grid` item in `00-TODO.md`:

1. mark worksheet choice `[-]`;
2. add a control using the imported workbook's worksheet names;
3. keep row and header normalization in the following TODO item.

## Files changed

- `src/data/importSpreadsheet.ts`
- `src/data/importSpreadsheet.test.ts`
- `src/App.tsx`
- `src/App.test.tsx`
- `src/store.ts`
- `src/store.test.ts`
- `docs/plan/00-TODO.md`
- `docs/plan/04-DATA-AND-SEARCH.md`
- `docs/plan/SESSION-HANDOFF.md`

## Tests run

- `bun run test -- src/data/importSpreadsheet.test.ts`
- `bun run test -- src/data/importSpreadsheet.test.ts src/store.test.ts src/App.test.tsx`
- `bun run check`

## Latest substantive commit

`5fcab3b feat: import local spreadsheets`
