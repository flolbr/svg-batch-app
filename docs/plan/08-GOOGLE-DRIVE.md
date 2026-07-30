# 08 — Google Drive

## Boundary

Google Drive is an optional adapter.

The app must remain fully usable without Google scripts, configuration, authentication, or network access.

Drive controls are enabled only when:

- protocol is HTTP(S);
- current origin is allow-listed;
- Google client ID and API key are configured.

## No backend for MVP

Use browser OAuth through Google Identity Services.

Do not include an OAuth client secret.

Do not implement refresh-token storage.

Access tokens remain in memory and are discarded when the session ends.

## Scope

Request:

```text
https://www.googleapis.com/auth/drive.file
```

Use Picker so the user explicitly selects files.

Do not request full Drive access.

## Lazy loading

Do not load Google scripts during ordinary local use.

On the first Drive action:

1. check hosted capability;
2. load Google Identity Services;
3. load Picker;
4. request token;
5. continue the requested action.

If loading fails, show an error and keep local features working.

## Imports

Picker supports choosing:

- SVG;
- CSV/XLS/XLSX;
- project HTML;
- native Google Sheets.

For native Sheets in the MVP:

- export to XLSX;
- parse through the same spreadsheet pipeline;
- show a clear error if export limits are exceeded.

Do not build direct live Sheets editing initially.

## Exports

Support:

- save a new project HTML;
- update an existing app-created project HTML;
- save ZIP/PDF/SVG/CSV outputs;
- choose a folder.

Store only safe project references:

```ts
type DriveReference = {
  provider: "google-drive";
  fileId: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  version?: string;
};
```

## Conflicts

Before updating an existing file:

1. fetch current metadata;
2. compare known modified time/version;
3. if changed, offer:
   - save a copy;
   - reload;
   - overwrite;
   - cancel.

Default to save a copy.

## Linked Drive SVG

Manual reload:

1. authenticate;
2. fetch metadata;
3. download SVG content;
4. hash;
5. run the same temporary import and compatibility report used by local linked SVG;
6. apply only after user confirmation.

If access is revoked or the file is missing, keep using the embedded SVG.

## Local file mode

When opened through `file://`:

- Drive buttons remain visible only if useful for explaining availability, but disabled;
- show: “Open this project through the hosted app to use Google Drive”;
- never attempt OAuth.

## Configuration

Environment variables:

```text
VITE_GOOGLE_CLIENT_ID
VITE_GOOGLE_API_KEY
VITE_GOOGLE_APP_ID
VITE_GOOGLE_ALLOWED_ORIGINS
```

These are deployment identifiers, not secrets. Still restrict the API key and OAuth origins in Google Cloud configuration.

## Deferred

- Shared Drives;
- background change detection;
- Drive webhooks;
- automatic periodic reload;
- broad Drive search;
- collaborative project locking.
