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
- [ ] Normalize headers, rows, displayed values, and stable row IDs.
- [ ] Render the grid with TanStack Table.
- [ ] Add row virtualization only when row count exceeds a clear threshold.
- [ ] Add fuzzy row-value search across all or selected columns.
- [ ] Add Excel-style per-column filters.
- [ ] Keep filtering and row selection independent.
- [ ] Add “select all matching”, “select visible page”, and “clear selection”.
- [ ] Add editable manual rows through the final “+ Add row” line.
- [ ] Add edit overrides for imported rows without mutating source rows.
- [ ] Add visible/exported-column selection.
- [ ] Persist selected rows, filters, edits, and manual rows.

## Phase 3 — SVG import, tree, and preview

- [ ] Import and sanitize a local SVG.
- [ ] Validate unique IDs and supported targets.
- [ ] Build the SVG object tree from the sanitized DOM.
- [ ] Implement the custom accessible tree:
  - expand/collapse;
  - single selection;
  - search;
  - mapping status;
  - keyboard navigation.
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
