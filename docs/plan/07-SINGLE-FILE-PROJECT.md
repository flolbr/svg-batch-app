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

Export artifacts remain transient Blobs and local batch values. Saving after
an export still serializes only the strict Project schema: the accepted
template is retained, while mapped SVG/PDF bytes, ZIP bytes, output filenames,
statuses, and manifest entries are excluded from the project block.

## Project block

Use one inert JSON script:

```html
<script id="svg-batch-project" type="application/json">
  { ... }
</script>
```

Escape `<` in serialized JSON to prevent accidental script termination.

`createProjectSnapshot` validates a fresh snapshot from current runtime
template, mapping, data, selection, source, export, and audit state.
`serializeProjectHtml` validates that snapshot again, clones the clean shell,
replaces exactly one inert project block, escapes literal `<` characters, and
prepends the HTML doctype without touching the source document.

## Schema

```ts
type Project = {
  schemaVersion: 1;
  projectId: string;
  name: string;
  template?: TemplateProjectState;
  data?: DataProjectState;
  mappings: Mapping[];
  assets: ProjectAsset[];
  exportSettings: ExportSettings;
  sources: PersistedSourceReference[];
  audit: ProjectAudit;
};
```

Version 1 is strict at every persisted boundary. The template stores the
accepted SVG text, source metadata, and selected object ID; targets and the
object tree remain derived runtime data. Export settings contain the SVG/PDF
format, CSV choice, filename template, collision policy, and partial-export
choice. Embedded raster assets carry their MIME-matched data URL. Persisted
source records identify embedded, linked, Drive, or HTTPS origins without
storing file handles or OAuth credentials.

All project JSON enters through `parseProject`. It dispatches on
`schemaVersion`, validates version 1, and is the single place where future
version migrations will be added. Missing and unknown versions fail before any
state is loaded.

The Phase 2 data boundary is:

```ts
type DataProjectState = {
  fileName: string;
  fileSize: number;
  sheetNames: string[];
  selectedSheetName: string;
  worksheets: Record<string, {
    data: NormalizedWorksheet;
    selectedRowIds: RowId[];
    filters: ColumnFilter[];
    rowOverrides: RowOverride[];
    manualRows: ManualRow[];
    columnPreferences: ColumnPreferences;
  }>;
};
```

The parsed workbook remains transient. Every worksheet is normalized at import
so a project can restore the Data panel and switch worksheets without the
original file.

Validate with Zod at load.

Hydration also revalidates the accepted SVG snapshot as untrusted input, then
rebuilds its targets and object tree. Only after those checks pass does the
store restore normalized data, mappings, row and SVG-object selections, source
metadata, and export settings.

Unknown future versions must fail with a useful message rather than partially loading.

## Saving

The application needs a clean HTML shell with the project block replaced.

Implementation options, in preferred order:

1. retain a clean clone of the initial document before React mounts;
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

The application captures its clean document before React mounts. “Save
project” builds a fresh validated snapshot, serializes that clean shell, writes
an HTML Blob through the selected handle, and reuses the handle on later saves.
Cancellation is quiet; write and close failures leave the prior saved audit
unchanged and surface an error.

Fallback:

- create Blob URL;
- trigger download;
- revoke URL.

When the picker is unavailable, the same validated HTML is downloaded with the
sanitized project filename. The short-lived object URL is revoked even if the
browser click fails.

## Recovery

After meaningful edits, debounce a recovery snapshot into IndexedDB.

Recovery is not the primary save.

Recovery records are strict complete projects keyed by project ID. The first
render establishes the clean baseline; later meaningful state changes debounce
for 750 ms. Returning to the saved baseline or completing a primary save
deletes the recovery record.

On startup:

- compare saved project audit time with recovery time;
- offer recovery only when it is newer;
- allow discard.

Startup validates the matching record before comparison. A native confirmation
keeps startup independent from React; accepting loads the newer snapshot and
declining deletes it. Missing, stale, mismatched, and corrupt records never
partially load.

## Linked SVG reload

A project persists its currently accepted SVG snapshot in `template` even when
the SVG is linked. Local linking can establish the first template or replace an
active one. The candidate is validated before its File System Access handle is
stored in IndexedDB under a project-scoped portable reference; project HTML
stores only that reference. HTTPS links store an HTTPS URL, fetch with
credentials omitted, and explain HTTP or failed CORS/network reads. Google
Drive source records are schema-supported, but their reload adapter belongs to
Phase 8.

Reload is manual. Every candidate goes through the normal untrusted SVG import
validation path. The app computes SHA-256 hashes over accepted sanitized SVG
text; byte-identical reloads leave template, selection, audit, and undo state
unchanged. Changed candidates retain only mappings whose target IDs still
exist and whose mapping types remain compatible with the new target elements.
The SVG panel keeps a comparison summary naming preserved, missing,
incompatible, and new target IDs, capped at 20 displayed IDs per category with
the remaining count shown.

A failed, unavailable, or rejected link does not replace the current accepted
snapshot. After a successful linked update, one prior template, mapping set,
project metadata, and object selection are retained in memory for Undo. That
undo state is cleared by a successful project save and when a source is later
replaced; it is not persisted.

## Single-file build

`vite build --mode single` must emit one HTML file with no local JS or CSS dependencies.

Core functionality must not require CDNs.

Google scripts are a hosted-mode exception and are loaded lazily only after a Drive action.

`bun run verify:single` builds and then enforces this boundary: `dist` contains
only `index.html`, the document has inline JavaScript and CSS plus the project
block, and markup/CSS contain no external runtime resource references.

The production acceptance path opens the build from `file://`, saves a project,
disables browser networking, and reopens that saved file. Spreadsheet and SVG
sources, mappings, selections, and export controls must restore with no
resource requests.

## Signed application updates

The saved HTML contains a fixed application shell and one validated project
block. A release update replaces the shell, not the project:

1. fetch a small static signed manifest only after a permitted launch check or
   an explicit “Check for updates” action;
2. verify its ECDSA P-256 signature with the public key embedded in the shell;
3. require the expected application ID and a strictly newer semantic version;
4. fetch the referenced single-file release and verify its SHA-256 hash;
5. reject a release without exactly one valid, replaceable
   `#svg-batch-project` block;
6. serialize the current validated project snapshot into that verified shell;
7. download a new project HTML, leaving the old file as rollback.

The update path must reuse the normal project serializer and parser. It must
not copy live DOM, preview output, OAuth tokens, file handles, recovery data,
or generated exports into the new shell.

The first implementation stays deliberately small: one stable release channel,
one application ID, manual checking, an optional launch check that can be disabled,
release notes for the offered version, and download-based application. Do not
add background polling, delta patches, a service worker, a generic updater
framework, or a new runtime crypto dependency.

Update checks send no project identifiers or content. Offline mode prevents all
update network access. Network failure leaves the current file fully usable and
is reported as a recoverable status rather than a startup error.

### Release channel

`package.json` is the application-version source of truth and the build embeds
that version in the shell and project audit. A release script builds the exact
single HTML artifact, computes its SHA-256, signs a manifest locally with an
offline private key, verifies the result, and prepares the artifact and manifest
for GitHub Pages and a GitHub Release. GitHub Pages is the canonical HTTPS
channel: it serves the signed manifest and immutable versioned HTML paths that
the application checks. GitHub Releases mirror the exact signed HTML bytes for
human downloads, changelogs, and archive history. GitHub Actions may deploy
already-signed bytes, but must never hold or use the private signing key.

Before enabling the channel, verify that a `file://` application can fetch the
Pages manifest and artifact, that served bytes retain the signed hash, and that
the previous version remains usable as rollback. There is no unsigned fallback.

The private signing key never enters the repository or CI. The public key is
embedded in shipped shells. Losing the private key or rotating the public key
would strand existing files, so key custody and recovery are release-blocking
operational requirements.

Release tests must prove refusal of a bad signature, altered artifact, wrong
application ID, same/older version, malformed shell, and a project block that
could terminate its script element. A rehearsal uses a disposable key and does
not publish anything.

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
