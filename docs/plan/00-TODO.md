# 00 — TODO

Last updated: 2026-07-30

## Status legend

- `[ ]` not started
- `[-]` in progress
- `[x]` complete
- `[!]` blocked

Only one implementation item should normally be `[-]`.

## Handoff preparation

- [x] Record agreed product scope.
- [x] Record architecture and technology choices.
- [x] Include the approved UI reference image.
- [x] Add Bun setup script and starter Vite shell.
- [x] Add agent workflow and context-compaction instructions.
- [x] Verify the documented README setup against the current dependency versions.
  - Main files: `package.json`, `bun.lock`, `src/vite-env.d.ts`, `vitest.setup.ts`.
  - Tests: `bun run check`; Browser Harness launch check at `http://localhost:5173/`.

## Phase 1 — Application shell

- [x] Replace the starter screen with the fixed three-panel desktop layout.
  - Acceptance:
    - left data panel;
    - center SVG tree and mapping panel;
    - right preview panel;
    - persistent bottom action bar;
    - responsive fallback stacks panels below 1100 px.
  - Main files: `src/App.tsx`, `src/styles.css`, `src/App.test.tsx`.
  - Tests: `bun run check`; Browser Harness at 1920 px and 1000 px.
- [x] Add Mantine theme and a small set of shared CSS variables matching the UI reference.
  - Main files: `src/theme.ts`, `src/main.tsx`, `src/styles.css`, `src/theme.test.ts`.
  - Tests: `bun run test -- src/theme.test.ts src/App.test.tsx`; `bun run check`; Browser Harness at 1920 px and 1000 px.
- [x] Add top-level error boundary and toast/notification surface.
  - Main files: `src/AppErrorBoundary.tsx`, `src/AppErrorBoundary.test.tsx`, `src/main.tsx`, `package.json`, `bun.lock`.
  - Tests: `bun run test -- src/AppErrorBoundary.test.tsx`; `bun run check`; Browser Harness runtime notification check at 1280 px.
- [x] Add accessible desktop panel resize handles while keeping the responsive stack fixed.
  - Main files: `src/App.tsx`, `src/styles.css`, `src/App.test.tsx`, `docs/plan/03-UI-AND-COMPONENTS.md`.
  - Tests: `bun run test -- src/App.test.tsx`; `bun run check`; Browser Harness pointer, keyboard, and responsive checks at 1920 px and 1000 px.
- [x] Add initial Zustand store with project, UI, source, and selection slices.
  - Main files: `src/store.ts`, `src/store.test.ts`, `src/App.tsx`.
  - Tests: `bun run test -- src/store.test.ts`; `bun run test -- src/App.test.tsx`; `bun run check`.
- [x] Parse and validate the embedded `#svg-batch-project` JSON at startup.
  - Initial implementation validates only the current project identity fields; the complete persisted schema remains a Phase 6 item.
  - Main files: `src/project/loadProject.ts`, `src/project/loadProject.test.ts`, `src/main.tsx`, `src/store.ts`, `src/store.test.ts`.
  - Tests: `bun run test -- src/project/loadProject.test.ts src/store.test.ts`; `bun run check`.

## Phase 2 — Spreadsheet import and grid

- [x] Import local CSV, XLSX, and XLS files.
  - Main files: `src/data/importSpreadsheet.ts`, `src/store.ts`, `src/App.tsx`.
  - Tests: `bun run test -- src/data/importSpreadsheet.test.ts`; `bun run test -- src/data/importSpreadsheet.test.ts src/store.test.ts src/App.test.tsx`; `bun run check`.
- [x] Let the user choose a worksheet.
  - Main files: `src/store.ts`, `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/store.test.ts`; `bun run test -- src/store.test.ts src/App.test.tsx`; `bun run check`.
- [x] Normalize headers, rows, displayed values, and stable row IDs.
  - Main files: `src/data/normalizeWorkbook.ts`, `src/data/importSpreadsheet.ts`, `src/store.ts`.
  - Tests: `bun run test -- src/data/normalizeWorkbook.test.ts src/data/importSpreadsheet.test.ts src/store.test.ts src/App.test.tsx`; `bun run check`.
- [x] Render the grid with TanStack Table.
  - Main files: `src/App.tsx`, `src/App.test.tsx`, `src/styles.css`.
  - Tests: `bun run test -- src/App.test.tsx`; `bun run check`.
- [x] Add row virtualization only when row count exceeds a clear threshold.
  - Rows up to 200 use the ordinary table path; larger result sets use TanStack Virtual.
  - Main files: `src/App.tsx`, `src/App.test.tsx`, `src/styles.css`.
  - Tests: `bun run test -- src/App.test.tsx`; `bun run check`.
- [x] Add fuzzy row-value search across all or selected columns.
  - Main files: `src/data/searchRows.ts`, `src/data/searchRows.test.ts`, `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/data/searchRows.test.ts src/App.test.tsx`; `bun run check`.
- [x] Add Excel-style per-column filters.
  - Supports distinct values, text contains/equals, number ranges, date ranges,
    and blank/non-blank matching; filters combine with fuzzy search using AND.
  - Main files: `src/ColumnFilters.tsx`, `src/data/filterRows.ts`,
    `src/data/filterRows.test.ts`, `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/data/filterRows.test.ts src/data/searchRows.test.ts src/App.test.tsx`;
    `bun run check`.
- [x] Keep filtering and row selection independent.
  - Leading row checkboxes toggle stable row IDs in the Zustand selection
    slice; search and column filters only change row visibility.
  - Main files: `src/data/rowSelection.ts`,
    `src/data/rowSelection.test.ts`, `src/store.ts`, `src/store.test.ts`,
    `src/App.tsx`, `src/App.test.tsx`, `src/styles.css`.
  - Tests: `bun run test -- src/data/rowSelection.test.ts src/store.test.ts src/App.test.tsx`;
    `bun run check`.
- [x] Add “select all matching”, “select visible page”, and “clear selection”.
  - The header checkbox selects or clears the current visible range and exposes
    checked and indeterminate states.
  - In virtualized grids, the visible page is the current viewport range;
    otherwise it is the full displayed result set.
  - Main files: `src/data/rowSelection.ts`,
    `src/data/rowSelection.test.ts`, `src/store.ts`, `src/store.test.ts`,
    `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/data/rowSelection.test.ts src/store.test.ts src/App.test.tsx`;
    `bun run check`.
- [x] Add editable manual rows through the final “+ Add row” line.
  - Manual rows are worksheet-scoped and support Tab navigation, Enter to
    finish a cell edit, tab/newline paste, duplication, and deletion.
  - Manual rows retain stable IDs, remain separate from immutable imported
    rows, and participate in search, filters, selection, and footer counts.
  - Main files: `src/data/manualRows.ts`, `src/data/manualRows.test.ts`,
    `src/store.ts`, `src/store.test.ts`, `src/App.tsx`, `src/App.test.tsx`,
    `src/styles.css`.
  - Tests: `bun run test -- src/data/manualRows.test.ts src/data/searchRows.test.ts src/data/filterRows.test.ts src/store.test.ts src/App.test.tsx`;
    `bun run check`.
- [x] Add edit overrides for imported rows without mutating source rows.
  - Imported rows enter editing only through an explicit action. Effective
    values feed search, filters, selection, virtualization, and counts while
    normalized source rows remain unchanged.
  - Overrides are worksheet-scoped, show a Modified marker, can be reset, and
    retain stable row IDs across worksheet switches.
  - Main files: `src/data/rowOverrides.ts`,
    `src/data/rowOverrides.test.ts`, `src/store.ts`, `src/store.test.ts`,
    `src/App.tsx`, `src/App.test.tsx`, `src/styles.css`.
  - Tests: `bun run test -- src/data/rowOverrides.test.ts src/store.test.ts src/App.test.tsx`;
    `bun run check`.
- [x] Add visible/exported-column selection.
  - Visible and exported columns are independent, worksheet-scoped
    preferences that default to every imported column.
  - The Columns popover controls grid visibility and future export inclusion.
    Hidden columns remain available to search, filters, and future mappings.
  - Main files: `src/data/columnPreferences.ts`,
    `src/data/columnPreferences.test.ts`, `src/ColumnSettings.tsx`,
    `src/store.ts`, `src/store.test.ts`, `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/data/columnPreferences.test.ts src/store.test.ts src/App.test.tsx`;
    `bun run check`.
- [x] Persist selected rows, filters, edits, and manual rows.
  - Implementation includes the normalized worksheet snapshot and existing
    column preferences so restored row IDs and worksheet state remain valid.
  - Every worksheet is normalized at import. Validated project data stores
    worksheet-scoped selections, filters, overrides, manual rows, and column
    preferences without storing the parsed workbook.
  - Loading project data restores the complete Data panel state and worksheet
    switching without requiring the original spreadsheet file.
  - Main files: `src/project/dataProjectState.ts`,
    `src/project/dataProjectState.test.ts`, `src/project/loadProject.ts`,
    `src/project/loadProject.test.ts`, `src/store.ts`, `src/store.test.ts`,
    `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/project/dataProjectState.test.ts src/project/loadProject.test.ts src/store.test.ts src/App.test.tsx`;
    `bun run check`.

## Phase 3 — SVG import, tree, and preview

- [x] Import and sanitize a local SVG.
  - Local SVG files are parsed as XML, rejected when malformed or outside the
    supported element/resource subset, and sanitized with DOMPurify before
    their accepted string enters application state.
  - The SVG panel reports sanitized source status and keeps the previous source
    unchanged when an import fails.
  - Main files: `src/svg/importSvg.ts`, `src/svg/importSvg.test.ts`,
    `src/store.ts`, `src/store.test.ts`, `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/svg/importSvg.test.ts src/store.test.ts src/App.test.tsx`;
    `bun run check`; Browser Harness local SVG upload at 1920 px.
- [x] Validate unique IDs and supported targets.
  - SVG IDs must be non-empty and globally unique, and local `href`
    references must resolve before an imported template is accepted.
  - Mapping targets are ID-bearing visible/container elements in document
    order. Definitions, masks, clips, gradients, symbols, and their descendants
    remain resources rather than mapping targets.
  - Main files: `src/svg/validateSvgTargets.ts`,
    `src/svg/validateSvgTargets.test.ts`, `src/svg/importSvg.ts`,
    `src/svg/importSvg.test.ts`, `src/App.tsx`, `src/App.test.tsx`,
    `src/store.test.ts`.
  - Tests: `bun run test -- src/svg/validateSvgTargets.test.ts src/svg/importSvg.test.ts src/store.test.ts src/App.test.tsx`;
    `bun run check`; Browser Harness local SVG target-count check.
- [x] Build the SVG object tree from the sanitized DOM.
  - Tree nodes preserve document order and nest beneath their nearest
    addressable ancestor, skipping non-target wrappers and resource content.
  - Labels prefer Inkscape metadata, `aria-label`, direct child `title`, ID,
    then tag name. The SVG panel renders the resulting hierarchy as a compact
    read-only list.
  - Main files: `src/svg/buildSvgTree.ts`, `src/svg/buildSvgTree.test.ts`,
    `src/svg/importSvg.ts`, `src/svg/importSvg.test.ts`, `src/App.tsx`,
    `src/App.test.tsx`, `src/styles.css`, `src/store.test.ts`.
  - Tests: `bun run test -- src/svg/buildSvgTree.test.ts src/svg/importSvg.test.ts src/store.test.ts src/App.test.tsx`;
    `bun run check`; Browser Harness nested SVG object-list check.
- [x] Implement the custom accessible tree:
  - expand/collapse;
  - single selection;
  - search;
  - mapping status;
  - keyboard navigation.
  - The semantic tree uses roving focus, `aria-expanded`/`aria-selected`,
    ancestor-preserving accent-insensitive search, and the documented arrow
    and Enter behavior. Mapping status is explicitly Unmapped until mappings
    exist.
  - SVG-object selection lives in Zustand and resets when the source changes.
  - Main files: `src/SvgObjectTree.tsx`, `src/SvgObjectTree.test.tsx`,
    `src/SvgObjectTree.module.css`, `src/store.ts`, `src/store.test.ts`,
    `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/SvgObjectTree.test.tsx src/store.test.ts src/App.test.tsx`;
    `bun run check`; Browser Harness tree search, selection, and keyboard check.
- [ ] Render the live preview in an isolated container.
- [ ] Highlight the selected SVG object in the preview.
- [ ] Add previous/next selected-row preview controls.
- [ ] Add zoom and fit controls.
- [ ] Show source status: embedded, linked, Drive, unavailable, modified.

## Phase 4 — Mapping engine

- [ ] Define mapping schemas with Zod.
- [ ] Implement direct text content mapping.
- [ ] Implement yes/no visibility mapping.
- [ ] Implement exclusive child selection by `data-option`, then ID fallback.
- [ ] Implement QR generation into a placeholder bounds.
- [ ] Implement image replacement mapping.
- [ ] Add text fitting:
  - keep size;
  - shrink to fit;
  - truncate;
  - validation error.
- [ ] Add mapping editor UI and column selector.
- [ ] Show mapping validity in the SVG tree.
- [ ] Add mapping application unit tests.

## Phase 5 — Validation and export

- [ ] Build one validation pipeline shared by preview and export.
- [ ] Validate missing columns, missing targets, unknown options, empty required cells, text overflow, external resources, and duplicate filenames.
- [ ] Show a compact validation report grouped by row and issue type.
- [ ] Export one SVG per selected row.
- [ ] Export one PDF per selected row with `svg2pdf.js` and jsPDF.
- [ ] Bundle multiple outputs with JSZip.
- [ ] Export selected source columns as CSV.
- [ ] Add `manifest.json` with requested name, actual name, status, and warnings.
- [ ] Add progress, cancel, continue-on-error, and retry-failed controls.
- [ ] Keep batch processing sequential initially. Add concurrency only if measured.
- [ ] Add filename sanitation and collision rules.

## Phase 6 — Single-file project save

- [ ] Define the complete project schema and migration entry point.
- [ ] Serialize the current project into `#svg-batch-project`.
- [ ] Produce a single HTML build with all core runtime assets inlined.
- [ ] Add “Save project” using File System Access API when available.
- [ ] Add download fallback.
- [ ] Add browser recovery snapshot in IndexedDB.
- [ ] Verify a saved HTML reopens with no network access and restores state.
- [ ] Verify generated outputs are not embedded in the project HTML.

## Phase 7 — Linked SVG manual reload

- [ ] Link a local SVG with a file handle.
- [ ] Store the handle in IndexedDB and a portable lookup reference in project data.
- [ ] Add remote HTTPS SVG link support with CORS-aware errors.
- [ ] Add Google Drive SVG link support through the Drive adapter.
- [ ] Implement the manual “Reload linked SVG” flow.
- [ ] Compare SHA-256 hashes.
- [ ] Validate and compare mappings before applying.
- [ ] Show preserved, missing, incompatible, and new objects.
- [ ] Keep the previous SVG in memory until the project is saved.
- [ ] Add “Undo template update”.
- [ ] Fall back to the embedded SVG when the link is unavailable.

## Phase 8 — Google Drive hosted adapter

- [ ] Add hosted-mode capability detection.
- [ ] Load Google Identity Services and Picker lazily.
- [ ] Authenticate with `drive.file`.
- [ ] Open SVG, spreadsheet, and project HTML files from Picker.
- [ ] Export native Google Sheets to XLSX for the MVP.
- [ ] Save new project and output files to a selected Drive folder.
- [ ] Update an existing app-created project file.
- [ ] Handle expired auth, revoked access, missing files, and file conflicts.
- [ ] Never expose Drive controls as functional in `file://` mode.
- [ ] Verify local core remains usable when Google scripts are blocked.

## Phase 9 — Release checks

- [ ] Test representative SVG fixtures.
- [ ] Test spreadsheets with duplicate/blank headers, dates, numbers, formulas, and leading zeros.
- [ ] Test 1, 100, 1,000, and 10,000-row datasets.
- [ ] Test keyboard-only navigation of the tree and grid controls.
- [ ] Test Chrome and Edge local-file flows.
- [ ] Test one current Firefox/Safari fallback path for download-based saving.
- [ ] Test hosted Drive import/save on localhost and production origin.
- [ ] Record practical file-size guidance in the UI.
- [ ] Complete `bun run check`.
