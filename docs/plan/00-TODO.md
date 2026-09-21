# 00 — TODO

Last updated: 2026-09-21

## Status legend

- `[ ]` not started
- `[-]` in progress
- `[x]` complete
- `[!]` blocked

Only one implementation item should normally be `[-]`.

## Handoff preparation

- [x] Record the Bento-inspired signed self-update requirements and release boundary.
  - Main files: `docs/plan/01-CONTEXT-AND-SCOPE.md`,
    `docs/plan/02-ARCHITECTURE.md`, `docs/plan/03-UI-AND-COMPONENTS.md`,
    `docs/plan/07-SINGLE-FILE-PROJECT.md`,
    `docs/plan/09-TEST-PLAN.md`, `docs/plan/10-DECISIONS.md`.
  - Tests: documentation review; no runtime behavior changed.
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
- [x] Render the live preview in an isolated container.
  - The accepted sanitized SVG is rendered only inside an empty-capability
    sandboxed `srcDoc` iframe and never inserted into the parent application
    DOM.
  - The preview centers and contains the SVG, ignores pointer interaction, and
    replaces its isolated document when a new template is accepted.
  - Main files: `src/SvgPreview.tsx`, `src/SvgPreview.test.tsx`,
    `src/SvgPreview.module.css`, `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/SvgPreview.test.tsx src/App.test.tsx`;
    `bun run check`; Browser Harness sandboxed preview check.
- [x] Highlight the selected SVG object in the preview.
  - The selected target receives a preview-only marker and blue outline/drop
    shadow inside the sandboxed iframe; changing selection moves the marker
    without mutating the accepted SVG snapshot.
  - Main files: `src/SvgPreview.tsx`, `src/SvgPreview.test.tsx`, `src/App.tsx`,
    `src/App.test.tsx`.
  - Tests: `bun run test -- src/SvgPreview.test.tsx src/App.test.tsx`;
    `bun run build:single`; `bun run check`; Browser Harness preview highlight
    check.
- [x] Add previous/next selected-row preview controls.
  - Preview navigation follows selected rows in active-worksheet order, keeps
    hidden selections available through filtering, and reconciles the active
    row when selection or worksheet state changes.
  - Main files: `src/App.tsx`, `src/App.test.tsx`, `src/store.ts`,
    `src/store.test.ts`.
  - Tests: `bun run test -- src/store.test.ts src/App.test.tsx`;
    `bun run check`; Browser Harness selected-row navigation check.
- [x] Add zoom and fit controls.
  - Zoom adjusts the isolated preview from 25% to 200% in 25% steps; Fit
    restores the existing 100% contained presentation without modifying the
    accepted SVG snapshot.
  - Main files: `src/App.tsx`, `src/App.test.tsx`, `src/SvgPreview.tsx`,
    `src/SvgPreview.test.tsx`.
  - Tests: `bun run test -- src/SvgPreview.test.tsx src/App.test.tsx`;
    `bun run check`; Browser Harness zoom and fit check.
- [x] Show source status: embedded, linked, Drive, unavailable, modified.
  - The SVG panel renders a typed compact status badge. Local imports are
    Embedded, no source is Unavailable, and later adapters can supply Linked,
    Drive, or Modified without enabling those unfinished flows.
  - Main files: `src/svg/importSvg.ts`, `src/svg/importSvg.test.ts`,
    `src/App.tsx`, `src/App.test.tsx`, `src/store.test.ts`.
  - Tests: `bun run test -- src/svg/importSvg.test.ts src/store.test.ts
    src/App.test.tsx`; `bun run check`; Browser Harness source-status check.

## Phase 4 — Mapping engine

- [x] Define mapping schemas with Zod.
  - Strict discriminated schemas cover text, visibility, exclusive group, QR,
    and image mappings with shared identifiers and documented option enums.
    Identifiers are trimmed and required; numeric options enforce their
    immediate bounds without adding speculative cross-field policy.
  - Main files: `src/mappings/schema.ts`, `src/mappings/schema.test.ts`.
  - Tests: `bun run test -- src/mappings/schema.test.ts`; `bunx tsc -b`;
    `bun run check`.
- [x] Implement direct text content mapping.
  - Direct mapping writes the row's displayed value to a caller-owned cloned
    `text` or `tspan` target. It reports structured issues for missing columns,
    missing/incompatible targets, and blank required values without throwing
    or changing the accepted template.
  - Main files: `src/mappings/textMapping.ts`,
    `src/mappings/textMapping.test.ts`, `src/mappings/validation.ts`.
  - Tests: `bun run test -- src/mappings/textMapping.test.ts`; `bunx tsc -b`;
    `bun run check`.
- [x] Implement yes/no visibility mapping.
  - Visibility values and configured true/false lists are normalized by case
    and whitespace. True/show removes the direct `display` attribute;
    false/hide sets `display="none"`; empty, unknown, ambiguous, missing
    column, and missing target cases return structured issues as applicable.
  - Main files: `src/mappings/visibilityMapping.ts`,
    `src/mappings/visibilityMapping.test.ts`, `src/mappings/mappingUtils.ts`,
    `src/mappings/textMapping.ts`.
  - Tests: `bun run test -- src/mappings/visibilityMapping.test.ts
    src/mappings/textMapping.test.ts`; `bunx tsc -b`; `bun run check`.
- [x] Implement exclusive child selection by `data-option`, then ID fallback.
  - Exclusive groups match only direct candidate children. `data-option` mode
    prefers an exact trimmed option and falls back to an exact child ID; ID
    mode matches IDs directly. The selected option is shown and other
    candidates are hidden, while non-candidates and nested descendants remain
    unchanged.
  - Empty, required, unknown, ambiguous, missing, and incompatible cases
    return structured issues without partial mutation.
  - Main files: `src/mappings/groupMapping.ts`,
    `src/mappings/groupMapping.test.ts`.
  - Tests: `bun run test -- src/mappings/groupMapping.test.ts
    src/mappings/visibilityMapping.test.ts src/mappings/textMapping.test.ts`;
    `bunx tsc -b`; `bun run check`.
- [x] Implement QR generation into a placeholder bounds.
  - QR mapping reads finite positive bounds from the target group's first
    direct rectangle, centers a square code, applies the configured quiet-zone
    margin and error correction, and replaces placeholder children with a
    crisp white vector background plus one black vector path.
  - Empty, required, missing, incompatible, invalid-bounds, and generation
    failures return structured issues without partial replacement.
  - Main files: `src/mappings/qrMapping.ts`,
    `src/mappings/qrMapping.test.ts`.
  - Tests: `bun run test -- src/mappings/qrMapping.test.ts
    src/mappings/groupMapping.test.ts src/mappings/visibilityMapping.test.ts
    src/mappings/textMapping.test.ts`; `bun run build:single`; `bun run check`.
- [x] Implement image replacement mapping.
  - Image mapping replaces bounded `<image>` targets and expresses contain,
    cover, or stretch through `preserveAspectRatio` while preserving geometry
    and unrelated attributes.
  - Direct values accept embedded raster data URLs only. An explicit resolver
    can supply validated raster data, blob, or HTTPS values for later
    local/Drive/remote adapters. Unsafe, missing, resolver, empty, required,
    target, and bounds failures return structured issues without mutation.
  - Main files: `src/mappings/imageMapping.ts`,
    `src/mappings/imageMapping.test.ts`.
  - Tests: `bun run test -- src/mappings/imageMapping.test.ts
    src/mappings/qrMapping.test.ts src/mappings/groupMapping.test.ts
    src/mappings/visibilityMapping.test.ts src/mappings/textMapping.test.ts`;
    `bunx tsc -b`; `bun run check`.
- [x] Add text fitting:
  - keep size;
  - shrink to fit;
  - truncate;
  - validation error.
  - Text measurement is injected so preview and export can share the same
    deterministic fitting behavior. Shrink respects the configured minimum,
    truncate is Unicode-safe, and unresolved overflow returns a structured
    issue.
  - Main files: `src/mappings/textFitting.ts`,
    `src/mappings/textFitting.test.ts`, `src/mappings/textMapping.ts`,
    `src/mappings/textMapping.test.ts`.
  - Tests: `bun run check`.
- [x] Add mapping editor UI and column selector.
  - The selected SVG target exposes one controlled mapping with compatible
    mapping types, the active worksheet's full column list, required state,
    type-specific options, schema feedback, and explicit removal.
  - Mappings live in a small Zustand array keyed by target ID. Replacing the
    SVG clears them; changing worksheets preserves them so missing columns can
    be surfaced by validation rather than silently discarded.
  - Main files: `src/MappingEditor.tsx`, `src/MappingEditor.test.tsx`,
    `src/store.ts`, `src/store.test.ts`, `src/App.tsx`, `src/App.test.tsx`,
    `src/styles.css`.
  - Tests: `bun run test -- src/MappingEditor.test.tsx src/store.test.ts
    src/App.test.tsx`; `bun run check`; Browser Harness mapping create, column,
    fit, and removal checks with the membership demo fixtures.
- [x] Show mapping validity in the SVG tree.
  - One pure status function is shared by the mapping editor and tree:
    unmapped without configuration, mapped when valid, warning when the
    active worksheet lacks the mapped column, and error for invalid,
    mismatched, or target-incompatible mappings.
  - Tree badges use visible text, color, a compact symbol, and a title with the
    exact status explanation; the tree remains independent of Zustand.
  - Main files: `src/mappings/mappingStatus.ts`,
    `src/mappings/mappingStatus.test.ts`, `src/SvgObjectTree.tsx`,
    `src/SvgObjectTree.test.tsx`, `src/SvgObjectTree.module.css`,
    `src/MappingEditor.tsx`, `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/mappings/mappingStatus.test.ts
    src/MappingEditor.test.tsx src/SvgObjectTree.test.tsx src/App.test.tsx`;
    `bunx tsc -b`; `bun run check`; Browser Harness mapped, missing-column
    warning, and unmapped checks with the membership demo fixtures.
- [x] Add mapping application unit tests.
  - `applyMappings` deep-clones the accepted SVG element, applies mappings in
    group, visibility, text, image, then QR order regardless of input order,
    aggregates row issues, and returns the caller-owned result.
  - Text measurement and image resolution remain explicit injected
    dependencies. One integration fixture covers every mapping type, while
    focused tests prove order, clone isolation, continuation, and issue order.
  - Main files: `src/mappings/applyMappings.ts`,
    `src/mappings/applyMappings.test.ts`.
  - Tests: `bun run test -- src/mappings/applyMappings.test.ts`;
    `bunx tsc -b`; `bun run check`.

## Phase 5 — Validation and export

- [x] Build one validation pipeline shared by preview and export.
  - Phase 6 regression verification found and fixed a missing preview caller:
    the active selected row now runs through `validateRows`, and Previous/Next
    replace the iframe document with that row's mapped SVG.
  - `validateRows` is the single deterministic entry point for one preview row
    or a selected export batch. Each row receives its own mapped SVG clone and
    ordered issues; the result also exposes aggregate issues and an error gate.
  - Mapping dependencies are passed through once for every row. Empty batches
    succeed without special caller logic.
  - Main files: `src/validation/validationPipeline.ts`,
    `src/validation/validationPipeline.test.ts`, `src/App.tsx`,
    `src/App.test.tsx`.
  - Tests: `bun run test -- src/validation/validationPipeline.test.ts
    src/mappings/applyMappings.test.ts src/App.test.tsx`; `bunx tsc -b`;
    `bun run check`; Browser Harness recording
    `preview-mapped-row-switch`.
- [x] Validate missing columns, missing targets, unknown options, empty required cells, text overflow, external resources, and duplicate filenames.
  - Mapping configuration is checked once per pipeline run. Missing columns,
    missing targets, and target-incompatible mappings are project issues and
    are skipped instead of producing the same failure for every row.
  - Existing mapping errors for unknown options, required blanks, and text
    overflow remain row-scoped. Generated SVGs are checked for non-embedded
    references after mappings run.
  - Requested filename collisions compare NFC-normalized, trimmed,
    case-insensitive names and attach one blocking issue to every involved row.
  - Main files: `src/validation/validationRules.ts`,
    `src/validation/filenameValidation.ts`,
    `src/validation/validationPipeline.ts` and their tests.
  - Tests: `bun run test -- src/validation/validationPipeline.test.ts
    src/validation/validationRules.test.ts
    src/validation/filenameValidation.test.ts
    src/mappings/applyMappings.test.ts`; `bunx tsc -b`; `bun run check`.
- [x] Show a compact validation report grouped by row and issue type.
  - The Validate action runs the shared pipeline for selected rows and opens a
    compact modal with aggregate severity counts, project issues, and
    expandable worksheet-row sections grouped by issue code.
  - Repeated messages within one issue type are counted instead of duplicated.
    A clean selection shows an explicit success state.
  - The footer keeps the latest issue count and returns to Not validated when
    the SVG, mappings, columns, or selected rows change.
  - Main files: `src/validation/validationReport.ts`,
    `src/ValidationReportModal.tsx`, `src/App.tsx` and their tests.
  - Tests: `bun run test -- src/validation/validationReport.test.ts
    src/ValidationReportModal.test.tsx src/App.test.tsx`; `bunx tsc -b`;
    `bun run check`; Browser Harness canonical CSV/SVG fixture check for
    selection, grouped row issue, accessible close, footer count, and stale
    result clearing.
- [x] Export one SVG per selected row.
  - Export selected runs the shared validation pipeline and opens the report
    without downloading when any blocking error exists.
  - Each valid selected row is serialized from its mapped SVG clone with a
    UTF-8 XML declaration and downloaded in worksheet order. Interim filenames
    use `row-{worksheet position}.svg` until the later filename-rules task.
  - Serialization remains independent of the small Blob/object-URL download
    boundary and does not mutate validated SVGs.
  - Main files: `src/export/svgExport.ts`, `src/export/svgExport.test.ts`,
    `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/export/svgExport.test.ts src/App.test.tsx`;
    `bunx tsc -b`; `bun run check`; Browser Harness canonical fixture download
    check for `row-1.svg`, its XML declaration and SVG content, and the
    validated footer state.
- [x] Export one PDF per selected row with `svg2pdf.js` and jsPDF.
  - The action-bar format selector switches between SVG and PDF while keeping
    the same validation gate and worksheet-order export flow.
  - PDF generation is sequential. Each mapped SVG is converted with
    `svg2pdf.js` into a jsPDF document whose point dimensions match the SVG
    `width`/`height`, falling back to its `viewBox`. Interim filenames use
    `row-{worksheet position}.pdf` until filename rules are implemented.
  - Main files: `src/export/pdfExport.ts`,
    `src/export/pdfExport.test.ts`, `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/export/pdfExport.test.ts
    src/export/svgExport.test.ts src/App.test.tsx`; `bunx tsc -b`;
    `bun run check`; Browser Harness canonical fixture check for a valid
    `row-1.pdf`, one 1200 × 800 pt page, and the validated footer state.
- [x] Bundle multiple outputs with JSZip.
  - Generated files are added to `svg-batch-export.zip` in worksheet order with
    their existing filenames and exact text or binary contents. The required
    manifest now makes every completed export an archive.
  - ZIP creation is independent of its Blob/object-URL download boundary and
    accepts both SVG strings and PDF buffers without mutating them.
  - Main files: `src/export/zipExport.ts`,
    `src/export/zipExport.test.ts`, `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/export/zipExport.test.ts
    src/export/svgExport.test.ts src/export/pdfExport.test.ts src/App.test.tsx`;
    `bunx tsc -b`; `bun run check`; Browser Harness canonical fixture check for
    one `svg-batch-export.zip` containing ordered `row-1.svg` and `row-2.svg`
    files with their expected XML declarations/content and a clean validation
    footer.
- [x] Export selected source columns as CSV.
  - The action bar can optionally include `selected-data.csv` beside the chosen
    SVG or PDF outputs. It uses active-worksheet export-column preferences in
    source order and selected effective rows in worksheet order.
  - CSV headers use display names; cells use displayed values so formatting and
    overrides are preserved. Output uses a UTF-8 BOM, CRLF records, a final
    CRLF, and standard comma/quote/line-break escaping.
  - Main files: `src/export/csvExport.ts`,
    `src/export/csvExport.test.ts`, `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/export/csvExport.test.ts
    src/export/zipExport.test.ts src/App.test.tsx`; `bunx tsc -b`;
    `bun run check`; Browser Harness canonical fixture check excluding the Note
    export column and producing one ZIP with two SVGs plus a BOM-prefixed
    `selected-data.csv` containing the remaining seven headers and two selected
    rows.
- [x] Add `manifest.json` with requested name, actual name, status, and warnings.
  - Every completed export appends a deterministic `manifest.json` array after
    its graphic files and optional CSV, so the browser receives one ZIP.
  - Each selected row has an ordered success entry with its row ID, current
    interim requested and actual filename, graphic output name, and row-level
    validation warning messages. Failed/skipped entries and errors are
    supported by the serializer for the later execution-controls task.
  - Main files: `src/export/manifestExport.ts`,
    `src/export/manifestExport.test.ts`, `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/export/manifestExport.test.ts
    src/export/zipExport.test.ts src/App.test.tsx`; `bunx tsc -b`;
    `bun run check`; Browser Harness canonical fixture check for one ZIP with
    two SVGs and a two-entry `manifest.json` containing ordered requested and
    actual names, success statuses, output names, and empty warning arrays.
- [x] Add progress, cancel, continue-on-error, and retry-failed controls.
  - A generic runner processes one row at a time, reports completed/total and
    the current filename, yields between rows for rendering/cancellation, and
    records success, failure, and skipped manifest entries in worksheet order.
  - Project validation errors always block. Row errors remain blocked unless
    the user explicitly enables “Continue on errors (partial export)”; runtime
    failures either stop and skip remaining rows or continue according to that
    control.
  - Cancel discards completed files and suppresses the archive even during the
    final ZIP step. Failed-row retry retains the original format/CSV choice,
    revalidates current data and mappings, and runs only failed row IDs.
  - Main files: `src/export/runExportBatch.ts`,
    `src/export/runExportBatch.test.ts`, `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/export/runExportBatch.test.ts
    src/App.test.tsx`; `bunx tsc -b`; `bun run check`; Browser Harness
    canonical nine-row PDF check with visible `1/9` progress, an available
    Cancel control, confirmed cancellation, and no downloaded archive.
- [x] Keep batch processing sequential initially. Add concurrency only if measured.
  - `runExportBatch` uses one ordered loop and awaits each row creator before
    advancing. No worker, `Promise.all`, or alternate concurrent path exists.
  - The runner test holds the first creator open and proves the second cannot
    start until it finishes, while retaining input/output/progress order.
  - Add concurrency only after a measured export bottleneck justifies the extra
    cancellation, ordering, and memory complexity.
  - Main files: `src/export/runExportBatch.ts`,
    `src/export/runExportBatch.test.ts`, `docs/plan/10-DECISIONS.md`.
  - Tests: `bun run test -- src/export/runExportBatch.test.ts`;
    `bunx tsc -b`; `bun run check`.
- [x] Add filename sanitation and collision rules.
  - Filename templates support `{row}` and displayed column-name placeholders.
    Actual filenames are normalized and sanitized for cross-platform use, capped
    at 180 Unicode code points, and protect Windows device names.
  - Collisions either receive deterministic numeric suffixes or block export;
    manifests retain both requested and actual filenames.
  - Main files: `src/export/filenameRules.ts`,
    `src/export/filenameRules.test.ts`, `src/App.tsx`,
    `src/validation/validationPipeline.ts`.
  - Tests: `bun run check` (41 files, 262 tests).

## Phase 6 — Single-file project save

- [x] Define the complete project schema and migration entry point.
  - Version 1 strictly validates identity, the accepted template snapshot,
    normalized data, mappings, embedded raster assets, export settings, source
    references, and audit data.
  - `parseProject` is the single version-dispatch boundary. Missing and
    unsupported versions fail without partially loading state.
  - Main files: `src/project/projectSchema.ts`,
    `src/project/projectSchema.test.ts`, `src/project/loadProject.ts`,
    `src/project/loadProject.test.ts`, `index.html`.
  - Tests: `bun run test -- src/project/projectSchema.test.ts
    src/project/loadProject.test.ts src/store.test.ts`; `bunx tsc -b`;
    `bun run check`.
- [x] Serialize the current project into `#svg-batch-project`.
  - Current template, data, mappings, selection, sources, export settings, and
    audit state form a newly validated snapshot. New local imports replace
    stale linked metadata while restored source references are preserved.
  - The clean document is cloned, the single inert project block is replaced,
    literal `<` characters are escaped as `\u003c`, and the source document is
    never mutated.
  - Main files: `src/project/createProjectSnapshot.ts`,
    `src/project/createProjectSnapshot.test.ts`,
    `src/project/serializeProjectHtml.ts`,
    `src/project/serializeProjectHtml.test.ts`.
  - Tests: `bun run test -- src/project/createProjectSnapshot.test.ts
    src/project/serializeProjectHtml.test.ts`; `bunx tsc -b`;
    `bun run check`.
- [x] Produce a single HTML build with all core runtime assets inlined.
  - The single build emits only `dist/index.html` with an embedded project
    block and inline application JavaScript and CSS.
  - `bun run verify:single` rejects extra output files, external markup
    resources, external CSS URLs, and CSS imports; it is part of `bun run
    check`.
  - Main files: `vite.config.ts`, `scripts/verify-single-build.ts`,
    `package.json`.
  - Tests: `bun run verify:single`; `bun run check`.
- [x] Add “Save project” using File System Access API when available.
  - The clean pre-mount document is retained and the current validated snapshot
    is written as a UTF-8 HTML Blob through `showSaveFilePicker`.
  - The selected handle is reused for later saves. State receives the new audit
    timestamp only after `close()` succeeds; cancellation is quiet and
    write/close failures preserve the prior project state.
  - Main files: `src/project/saveProjectFile.ts`,
    `src/project/saveProjectFile.test.ts`, `src/main.tsx`, `src/App.tsx`,
    `src/App.test.tsx`.
  - Tests: `bun run test -- src/project/saveProjectFile.test.ts
    src/project/createProjectSnapshot.test.ts
    src/project/serializeProjectHtml.test.ts src/App.test.tsx`;
    `bunx tsc -b`; `bun run check`; Browser Harness recording
    `phase6-file-save`.
- [x] Add download fallback.
  - Browsers without `showSaveFilePicker` download the same validated project
    HTML through a short-lived Blob URL and sanitized project filename.
  - The object URL is revoked after the click and also when the click throws.
  - Main files: `src/project/downloadProjectFile.ts`,
    `src/project/downloadProjectFile.test.ts`, `src/App.tsx`,
    `src/App.test.tsx`.
  - Tests: `bun run test -- src/project/downloadProjectFile.test.ts
    src/App.test.tsx`; `bunx tsc -b`; `bun run check`; Browser Harness
    recording `phase6-download-fallback` with a parsed downloaded HTML
    artifact.
- [x] Add browser recovery snapshot in IndexedDB.
  - Strict complete recovery projects are stored by project ID after 750 ms of
    dirty-state inactivity. Returning to the saved baseline or completing a
    primary save removes the record.
  - Startup validates the record and offers recover/discard only when its audit
    timestamp is newer. Corrupt and mismatched records are deleted without
    partial loading.
  - Main files: `src/project/recoveryStore.ts`,
    `src/project/recoveryStore.test.ts`, `src/project/startupRecovery.ts`,
    `src/project/startupRecovery.test.ts`, `src/main.tsx`, `src/App.tsx`,
    `src/App.test.tsx`.
  - Tests: `bun run test -- src/project/recoveryStore.test.ts
    src/project/startupRecovery.test.ts src/App.test.tsx`; `bunx tsc -b`;
    `bun run check`; Browser Harness recording `phase6-indexeddb-recovery`
    with the real stored project ID, final filename template, and newer audit.
- [x] Verify a saved HTML reopens with no network access and restores state.
  - Persisted SVG is revalidated as untrusted input before targets and the
    object tree are rebuilt. Unsafe snapshots fail before state is loaded.
  - Project hydration restores normalized data, mappings, row and SVG-object
    selections, source metadata, and export settings.
  - Main files: `src/svg/importSvg.ts`, `src/svg/importSvg.test.ts`,
    `src/project/loadProject.ts`, `src/project/loadProject.test.ts`,
    `src/project/recoveryStore.ts`, `src/store.ts`, `src/store.test.ts`.
  - Tests: `bun run test -- src/svg/importSvg.test.ts
    src/project/loadProject.test.ts src/project/recoveryStore.test.ts
    src/store.test.ts src/App.test.tsx`; `bunx tsc -b`; `bun run check`;
    Browser Harness recording `phase6-offline-reopen` opening production from
    `file://`, saving fixture state, disabling networking, and reopening with
    zero resource requests plus restored data/SVG sources, mapping, selection,
    PDF/CSV choices, and filename template.
- [x] Verify generated outputs are not embedded in the project HTML.
  - Generated SVG/PDF/ZIP files and manifest entries remain transient export
    values. Saving after an export serializes only the strict Project schema
    and preserves the accepted template rather than a mapped output clone.
  - Main files: `src/App.test.tsx`,
    `docs/plan/07-SINGLE-FILE-PROJECT.md`.
  - Tests: `bun run test -- src/App.test.tsx`; `bun run check` (48 test files,
    303 tests). The integration test creates and inspects a mapped SVG ZIP,
    then inspects the subsequently saved project block for the exact schema
    keys and absence of generated XML and manifest fields.

## Phase 7 — Linked SVG manual reload

- [x] Link a local SVG with a file handle.
  - The SVG-panel picker can establish the first template or replace an active
    one. It requests read permission, validates the selected SVG before
    persistence, and leaves state unchanged after cancellation or rejection.
- [x] Store the handle in IndexedDB and a portable lookup reference in project data.
  - File handles live in the `svg-batch-linked-svg` IndexedDB database. Project
    data stores only `local-svg:{projectId}` plus the accepted SVG snapshot;
    reopening on another device therefore keeps the snapshot available.
- [x] Add remote HTTPS SVG link support with CORS-aware errors.
  - URLs must use HTTPS. Fetch omits credentials and distinguishes HTTP status
    failures from network/likely-CORS failures before SVG validation.
- [x] Add Google Drive SVG link support through the Drive adapter.
  - Drive-selected SVGs use the existing sanitizer and linked-template
    compatibility path. Reload keeps the embedded snapshot on failure and
    applies a validated candidate only after explicit confirmation.
- [x] Implement the manual “Reload linked SVG” flow.
  - Reload resolves the persisted local or HTTPS source only after explicit
    user action. Matching SHA-256 content is a no-op; unavailable, denied,
    failed, and invalid candidates retain the active template.
- [x] Compare SHA-256 hashes.
  - Hashes use the sanitized accepted SVG text. Successful changes update
    `templateHash` and the old/new template audit; unchanged reloads do not
    create audit or undo state.
- [x] Validate and compare mappings before applying.
  - Candidates run through the existing untrusted import pipeline. Mappings
    survive only when their target ID remains and their type is compatible with
    the replacement target element.
- [x] Show preserved, missing, incompatible, and new objects.
  - A persistent SVG-panel summary names target IDs in all four categories,
    showing the first 20 IDs and an additional-count suffix for larger sets.
- [x] Keep the previous SVG in memory until the project is saved.
  - One runtime-only snapshot retains the previous SVG, mappings, project
    metadata, and selected object. It is never serialized.
- [x] Add “Undo template update”.
  - Undo restores the retained state and clears the comparison summary. A
    successful project save or later source replacement clears the undo state.
- [x] Fall back to the embedded SVG when the link is unavailable.
  - Source failures report why reload failed and continue using the current
    accepted project snapshot without changing mappings or selection.
  - Main files: `src/svg/linkedSvg.ts`, `src/svg/linkedSvg.test.ts`,
    `src/store.ts`, `src/store.test.ts`, `src/App.tsx`, `src/App.test.tsx`.
  - Focused tests: `bun run test -- src/App.test.tsx
    src/svg/linkedSvg.test.ts src/store.test.ts` (58 tests).
  - Full check: `bun run check` (49 test files, 315 tests; verified one
    self-contained `dist/index.html`, 2,296,262 bytes).

## Phase 8 — Google Drive hosted adapter

- [x] Add hosted-mode capability detection.
  - One capability object detects File System Access, IndexedDB, hosted
    HTTP(S), and exact allow-listed Drive configuration from deployment env.
    Drive controls remain disabled with a hosted-app explanation in `file://`.
  - Main files: `src/capabilities.ts`, `src/capabilities.test.ts`,
    `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/capabilities.test.ts src/App.test.tsx`
    (40 tests).
- [x] Load Google Identity Services and Picker lazily.
  - GIS and Google API scripts load only after an explicit Drive action.
    Concurrent calls share script/module loads, and failed loads remain
    retryable without affecting the local core.
- [x] Authenticate with `drive.file`.
  - OAuth requests exactly `drive.file`, keeps the token in memory only, and
    retries an unavailable silent grant through interactive consent.
  - Main files: `src/drive/googleClient.ts`,
    `src/drive/googleClient.test.ts`.
  - Tests: `bun run test -- src/drive/googleClient.test.ts` (7 tests);
    `bunx tsc -b`; `bun run lint`.
- [x] Open SVG, spreadsheet, and project HTML files from Picker.
  - Downloaded files pass through the same spreadsheet parser, SVG sanitizer,
    and embedded-project validator as local files.
- [x] Export native Google Sheets to XLSX for the MVP.
  - Native Sheets use the Drive export endpoint and then the existing XLSX
    import path; export-size failures receive a specific message.
- [x] Save new project and output files to a selected Drive folder.
  - New self-contained project HTML and generated ZIP output archives use a
    folder-only Picker and multipart Drive upload.
- [x] Update an existing app-created project file.
  - The in-memory safe Drive reference supports repeated project saves during
    the session and is also established when project HTML is opened by Picker.
- [x] Handle expired auth, revoked access, missing files, and file conflicts.
  - HTTP 401 retries once with a new in-memory token. Revoked/missing errors
    remain recoverable. Updates compare version/modified time and offer save a
    copy (default), reload, overwrite, or cancel.
- [x] Never expose Drive controls as functional in `file://` mode.
- [x] Verify local core remains usable when Google scripts are blocked.
  - Drive controls derive from capabilities, scripts load only after a Drive
    action, and script failures are isolated and retryable.
  - Main files: `src/drive/googleClient.ts`, `src/drive/driveFiles.ts`,
    `src/drive/importDriveFile.ts`, `src/App.tsx` and their tests.
  - Focused tests: `bun run test -- src/App.test.tsx
    src/drive/googleClient.test.ts src/drive/driveFiles.test.ts
    src/drive/importDriveFile.test.ts src/svg/linkedSvg.test.ts
    src/store.test.ts` (80 tests).
  - Full check: `bun run check` (53 test files, 342 tests; verified one
    self-contained `dist/index.html`, 2,310,112 bytes).

## Phase 9 — Signed application updates

- [x] Replace the placeholder application version with a build-time semantic version.
  - Main files: `vite.config.ts`, `src/vite-env.d.ts`, `src/appInfo.ts`,
    `src/appInfo.test.ts`, `src/App.tsx`.
  - Tests: `bun run test -- src/appInfo.test.ts
    src/project/createProjectSnapshot.test.ts src/App.test.tsx`; `bunx tsc -b`;
    `bun run verify:single`.
  - `package.json` is the source of truth. Embed the version and stable
    application ID in the built shell and new project audit snapshots.
- [x] Add the signed release-manifest parser and verifier.
  - Main files: `src/update/releaseManifest.ts`,
    `src/update/releaseManifest.test.ts`.
  - Tests: `bun run test -- src/update/releaseManifest.test.ts` (6 tests);
    `bunx tsc -b`; `bun run lint` (one pre-existing warning in
    `src/export/filenameRules.ts`).
  - Verify ECDSA P-256 with an embedded public key, require the expected
    application ID, validate manifest shape, and offer only a strictly newer
    semantic version.
  - Use Web Crypto directly; add no runtime crypto dependency.
- [x] Add manual and optional launch update checks with an offline control.
  - `checkForUpdates` fetches the signed manifest with `cache: no-store`,
    returns current/update/error states, and accepts injected fetch and keys for
    deterministic tests. UI and startup wiring remain a later sub-item.
  - Main files: `src/update/releaseManifest.ts`,
    `src/update/releaseManifest.test.ts`.
  - Tests: `bun run test -- src/update/releaseManifest.test.ts` (9 tests);
    `bunx tsc -b`.
  - A failed or blocked check must not affect local startup or project use.
  - Send no project ID, filename, content, or telemetry.
- [x] Download and verify the new single-file release.
  - `fetchVerifiedRelease` downloads with `cache: no-store`, checks the signed
    SHA-256 bytes, decodes the HTML, and accepts only one valid JSON project
    block before any future shell splice.
  - Main files: `src/update/releaseArtifact.ts`,
    `src/update/releaseArtifact.test.ts`.
  - Tests: `bun run test -- src/update/releaseArtifact.test.ts` (4 tests);
    `bunx tsc -b`.
  - Require the SHA-256 from the signed manifest and exactly one valid,
    replaceable `#svg-batch-project` block in the candidate shell.
- [x] Move the current project into the verified release shell.
  - `buildUpdatedProjectHtml` validates the candidate shell, reuses the
    existing project serializer, escapes project markup, and leaves both input
    shell and project objects unchanged.
  - Main files: `src/update/buildUpdatedProject.ts`,
    `src/update/buildUpdatedProject.test.ts`.
  - Tests: `bun run test -- src/update/buildUpdatedProject.test.ts` (2 tests);
    `bunx tsc -b`.
  - Reuse the validated snapshot and serializer, download a new HTML file, and
    leave the existing file untouched as rollback.
  - Do not transfer runtime-only handles, OAuth tokens, recovery records,
    preview DOM, or generated exports.
- [x] Add focused update UI.
  - The header exposes the current version, manual check, update-offline toggle,
    current/error status, release notes, and a download action for verified
    newer releases.
  - Main files: `src/App.tsx`, `src/App.test.tsx`.
  - Tests: `bun run test -- src/App.test.tsx` (40 tests); `bunx tsc -b`.
  - Show current version, check status, offered version, concise release notes,
    update action, offline state, and recoverable verification failures.
- [x] Add local release signing and publication tooling.
  - `release:keygen` creates an offline key outside the repository and refuses
    to overwrite it. `release:manifest` signs the exact artifact bytes and
    writes a deterministic manifest for static hosting/GitHub Release upload.
  - Main files: `scripts/releaseSigning.ts`,
    `scripts/releaseSigning.test.ts`, `package.json`.
  - Tests: `bun run test -- scripts/releaseSigning.test.ts` (2 tests);
    `bunx tsc -b`; `bun run lint` (one pre-existing warning in
    `src/export/filenameRules.ts`).
  - Generate and retain the private key outside the repository, build the exact
    artifact, hash it, sign and self-verify the static manifest, and prepare the
    HTML plus manifest for static hosting and a GitHub Release.
  - Do not place the private signing key in GitHub Actions or repository data.
- [x] Add release-channel security and migration tests.
  - Disposable-key coverage verifies signer/verifier compatibility; focused
    tests reject tampered manifests and artifacts, wrong application IDs,
    downgrade replays, malformed shells, and unsafe project blocks while
    preserving the original shell/project inputs.
  - Main files: `scripts/releaseSigning.test.ts`,
    `src/update/releaseManifest.test.ts`, `src/update/releaseArtifact.test.ts`,
    `src/update/buildUpdatedProject.test.ts`.
  - Tests: combined focused suites (18 tests); `bunx tsc -b`.
  - Rehearse with a disposable key and reject tampered manifests/artifacts,
    wrong application IDs, downgrade replays, malformed shells, and unsafe
    project-block content.
  - Verify that a previous release updates to the new shell with its complete
    project state unchanged and that its old file remains usable.
- [x] Document the hybrid GitHub Pages and GitHub Release channel.
  - GitHub Pages is the canonical HTTPS update channel for the signed manifest
    and immutable versioned HTML artifacts.
  - GitHub Releases mirror the exact signed artifact for human downloads,
    changelogs, and version history.
  - The documented procedure covers key custody, version bump, clean tagged
    build, Pages publication, GitHub Release creation, CORS-from-`file://`,
    and live previous-version acceptance.
  - Main files: `docs/plan/07-SINGLE-FILE-PROJECT.md`,
    `docs/plan/09-TEST-PLAN.md`, `docs/plan/10-DECISIONS.md`.
  - Tests: documentation review; no runtime behavior changed.

## Phase 10 — Release checks

- [x] Test representative SVG fixtures.
  - Canonical membership SVG and `/home/flo/Downloads/Sénior.svg` both loaded;
    the latter sanitized Inkscape metadata and local color-matrix filters and
    exposed 23 mapping targets.
  - Test: `src/svg/importSvg.test.ts`, fixture checksums, and live Chromium
    upload of `Sénior.svg`.
- [x] Test spreadsheets with duplicate/blank headers, dates, numbers, formulas, and leading zeros.
  - Canonical membership CSV/XLSX checksums and import/normalization tests
    passed, including BOM, blank cells, duplicate headers, dates, and leading
    zeros.
  - Test: spreadsheet and normalization suites (32 focused tests).
- [x] Test 1, 100, 1,000, and 10,000-row datasets.
  - Normalization produced the expected row counts in 0.5ms, 0.8ms, 2.2ms,
    and 18.2ms respectively.
- [x] Test keyboard-only navigation of the tree and grid controls.
  - SVG tree keyboard component coverage passed in the focused suite.
- [!] Test Chrome and Edge local-file flows.
  - Chromium `file://` smoke passed with no HTTP requests. Edge is blocked in
    this environment because no Edge runtime is installed and Playwright's
    installer requires interactive root privileges.
- [x] Test one current Firefox/Safari fallback path for download-based saving.
  - Firefox rendered the self-contained `file://` build with no HTTP requests.
  - Firefox Save project produced a downloadable HTML containing the embedded
    project block.
  - Test: Playwright Firefox local-file and download fallback checks.
- [!] Test hosted Drive import/save on localhost and production origin.
  - Blocked pending configured Google client values and an authorized test
    account; local Drive-disabled behavior is covered by component tests.
- [x] Test a signed update from the previous published application version.
  - Playwright opened the published `v0.1.0` artifact, discovered signed
    `v0.1.1`, displayed its notes, and downloaded the verified update shell.
  - The downloaded HTML contained the newer `appVersion` and the original
    release artifact remained available as rollback.
  - Test: one-off Playwright live browser acceptance against Pages.
- [x] Implement GitHub Pages and GitHub Release publication.
  - Keep signing local and offline; publish the signed manifest and immutable
    artifact to Pages, then attach the same bytes to a matching Release.
  - `scripts/publishRelease.ts` builds, signs, publishes the `gh-pages` branch,
    configures Pages, and creates the matching Release without CI key access.
  - Published `v0.1.0`; Pages and Release artifact hashes match.
  - Main files: `scripts/publishRelease.ts`, `src/update/releaseManifest.ts`,
    `package.json`.
  - Tests: `bunx tsc -b`; focused signing/manifest tests (12 passed);
    live Pages and Release hash verification.
- [x] Rehearse GitHub Pages publication with a byte-identical GitHub Release
  asset, including `file://` CORS fetch and rollback checks.
  - Pages served the manifest and immutable artifact over HTTPS; the artifact
    SHA-256 matched both the signed manifest and GitHub Release asset.
  - Pages was configured from `gh-pages`; the previous release remained live.
  - Test: live `curl`, GitHub CLI metadata, and Playwright browser flow.
- [x] Complete `bun run check`.
  - `bun run check`: 58 test files, 364 tests, self-contained 2,316,974-byte
    build; one pre-existing lint warning remains in `src/export/filenameRules.ts`.
- [x] Record practical file-size guidance in the UI.
  - Header guidance explains that embedded data and assets increase the saved
    single-file project size; App coverage passed.
  - Main files: `src/App.tsx`, `src/App.test.tsx`.
