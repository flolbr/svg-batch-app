# Session handoff

Last updated: 2026-07-30

## Current task

No implementation task is active. Embedded project startup loading is complete.

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
- `docs/examples/membership-demo/` is the canonical end-to-end fixture for
  spreadsheet, SVG, mapping, search, selection, filename, and export flows.
- The fixture includes matching CSV/XLSX customer data, a secondary worksheet,
  a safe SVG, expected mapping intent, and verified checksums.

## What remains

The complete persisted project schema and migrations remain Phase 6 work.
Spreadsheet import and other product behavior are not implemented yet; the
controls and sample data in the themed shell are static.

## Next concrete step

Start the first `Phase 2 — Spreadsheet import and grid` item in `00-TODO.md`:

1. mark local CSV, XLSX, and XLS import `[-]`;
2. inspect the spreadsheet and data-model plans before defining the import
   boundary;
3. keep worksheet selection and row normalization in their later TODO items.

## Files changed

- `.gitattributes`
- `README.md`
- `docs/examples/`
- `docs/plan/04-DATA-AND-SEARCH.md`
- `docs/plan/09-TEST-PLAN.md`
- `docs/plan/README.md`
- `docs/plan/SESSION-HANDOFF.md`

## Tests run

- `cd docs/examples/membership-demo && sha256sum -c SHA256SUMS`
- `jq empty docs/examples/membership-demo/expected-mappings.json`
- `xmllint --noout docs/examples/membership-demo/membership-template.svg`
- `bun run check`

## Latest substantive commit

`581d775 docs: add membership example fixtures`
