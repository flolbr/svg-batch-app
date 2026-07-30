# 02 — Architecture

## Core stack

- React + TypeScript
- Vite
- `vite-plugin-singlefile`
- Mantine Core and Hooks
- Tabler icons
- TanStack Table and TanStack Virtual
- Zustand
- Zod
- SheetJS Community Edition
- Fuse.js
- native `DOMParser`, `XMLSerializer`, and Web Crypto
- DOMPurify with a strict SVG allow-list
- `qrcode`
- jsPDF and `svg2pdf.js`
- JSZip
- IndexedDB through `idb`
- Google Identity Services, Picker, and Drive API v3 loaded only in hosted mode

## Why Mantine

Use Mantine for buttons, inputs, selects, menus, modals, drawers, tabs, tooltips, checkboxes, scroll areas, loaders, notifications, and layout primitives.

Do not create local equivalents unless the required behavior is missing.

Use custom components only for domain-specific UI:

- spreadsheet grid composition;
- SVG object tree;
- SVG preview;
- mapping editor;
- validation report;
- batch progress.

## Suggested source layout

```text
src/
  app/
    App.tsx
    store.ts
    capabilities.ts
  project/
    schema.ts
    loadProject.ts
    saveProject.ts
    migrations.ts
  data/
    importSpreadsheet.ts
    normalizeWorkbook.ts
    filters.ts
    search.ts
    rows.ts
  svg/
    importSvg.ts
    sanitizeSvg.ts
    validateSvg.ts
    buildTree.ts
    linkedSource.ts
  mappings/
    schema.ts
    applyMappings.ts
    textMapping.ts
    visibilityMapping.ts
    groupMapping.ts
    qrMapping.ts
    imageMapping.ts
  preview/
    PreviewPane.tsx
    renderPreview.ts
  export/
    validateBatch.ts
    exportSvg.ts
    exportPdf.ts
    exportZip.ts
    filenames.ts
  drive/
    capability.ts
    auth.ts
    picker.ts
    files.ts
  ui/
    AppLayout.tsx
    DataPanel.tsx
    SvgPanel.tsx
    PreviewPanel.tsx
    BottomBar.tsx
```

Do not create every file at once. Split a file only when it becomes difficult to read or test.

## Store shape

Keep persisted project data separate from transient UI state.

```ts
type AppStore = {
  project: Project;
  sources: SourceRuntimeState;
  ui: UiState;
  jobs: ExportJobState;

  setProject(project: Project): void;
  updateProject(change: (project: Project) => Project): void;
};
```

Persisted:

- normalized columns and source rows or their snapshot;
- row overrides;
- manual rows;
- selected rows;
- filters;
- visible/exported columns;
- SVG snapshot;
- mappings;
- source references;
- export settings.

Transient:

- open menus and dialogs;
- preview DOM;
- active OAuth token;
- current export progress;
- unsaved rollback SVG;
- File System handles;
- parsed workbook object.

## Domain rule

Rendering must be deterministic:

```text
effective row
+ accepted SVG snapshot
+ mappings
+ export settings
= generated document
```

Preview and export must call the same mapping and validation functions. Do not maintain separate logic paths.

## Large work

Use Web Workers only for measured blocking work.

First candidates:

- workbook parsing for large files;
- large batch generation.

Do not introduce a worker framework. A plain worker module is enough.

## Capability detection

Expose one small capability object:

```ts
type Capabilities = {
  fileSystemAccess: boolean;
  indexedDb: boolean;
  hostedOrigin: boolean;
  googleDriveConfigured: boolean;
};
```

UI behavior should be derived from this object rather than scattered protocol checks.
