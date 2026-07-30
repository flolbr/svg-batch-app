# 07 — Single-file project

## Goal

A built or saved project is one HTML file containing:

- bundled application JavaScript;
- bundled application CSS;
- current project JSON;
- accepted SVG snapshot;
- normalized spreadsheet snapshot;
- manual rows and overrides;
- mappings and selections;
- small embedded image assets;
- source references and export settings.

Generated PDFs, SVGs, and ZIPs are never embedded.

## Project block

Use one inert JSON script:

```html
<script id="svg-batch-project" type="application/json">
  { ... }
</script>
```

Escape `<` in serialized JSON to prevent accidental script termination.

## Schema

```ts
type Project = {
  schemaVersion: 1;
  projectId: string;
  name: string;
  template?: TemplateProjectState;
  data?: DataProjectState;
  mappings: Mapping[];
  selection: SelectionState;
  filters: PersistedFilterState;
  columnPreferences: ColumnPreferences;
  assets: ProjectAsset[];
  exportSettings: ExportSettings;
  sources: PersistedSourceReference[];
  audit: ProjectAudit;
};
```

Validate with Zod at load.

Unknown future versions must fail with a useful message rather than partially loading.

## Saving

The application needs a clean HTML shell with the project block replaced.

Implementation options, in preferred order:

1. retain a sanitized clone of the initial document before React mounts;
2. on save, clone that shell;
3. replace project JSON;
4. remove runtime-only attributes/nodes;
5. serialize with `<!doctype html>`.

Do not serialize the current live preview DOM.

## Local save

When available:

- use `showSaveFilePicker`;
- keep the handle for subsequent saves;
- write a Blob;
- mark project clean only after close succeeds.

Fallback:

- create Blob URL;
- trigger download;
- revoke URL.

## Recovery

After meaningful edits, debounce a recovery snapshot into IndexedDB.

Recovery is not the primary save.

On startup:

- compare saved project audit time with recovery time;
- offer recovery only when it is newer;
- allow discard.

## Single-file build

`vite build --mode single` must emit one HTML file with no local JS or CSS dependencies.

Core functionality must not require CDNs.

Google scripts are a hosted-mode exception and are loaded lazily only after a Drive action.

## File size guidance

Expected contributors:

- application libraries;
- SVG;
- normalized rows;
- embedded images.

Warn when:

- project HTML exceeds a practical threshold;
- an imported image is unusually large;
- row count is likely to slow browser-side batch export.

Do not reject large files without a measured reason.

## Audit information

Persist:

```ts
type ProjectAudit = {
  createdAt: string;
  updatedAt: string;
  appVersion: string;
  templateHash?: string;
  lastTemplateUpdate?: {
    oldHash: string;
    newHash: string;
    updatedAt: string;
    missingTargetIds: string[];
  };
};
```
