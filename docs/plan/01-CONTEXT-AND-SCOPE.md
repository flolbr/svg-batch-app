# 01 — Context and scope

## Product inspiration

The single-file product model is inspired by
[Bento](https://github.com/nyblnet/bento): the document carries its own
viewer/editor, saves its data back into the file, and can move that data into a
newer verified application shell. SVG Batch Generator remains its own focused
product; Bento is architectural inspiration, not a dependency or a feature
checklist.

## Product summary

A desktop-first browser application for generating personalized SVG and PDF files from spreadsheet rows.

The user imports:

1. one SVG template;
2. one CSV/XLS/XLSX spreadsheet;
3. optional image assets.

The user maps SVG objects to spreadsheet columns, previews rows, selects which rows to process, and exports generated files.

The project itself is saved as one self-contained HTML file containing the application and the latest project snapshot.

## MVP user flow

1. Open the HTML application.
2. Import or restore a project.
3. Import an SVG.
4. Import spreadsheet data and choose a worksheet.
5. Search/filter rows and select rows for generation.
6. Inspect the SVG object tree.
7. Map SVG targets.
8. Preview a selected row.
9. Validate.
10. Export SVG/PDF/CSV/manifest, usually as a ZIP.
11. Save the project HTML locally or to Google Drive in hosted mode.
12. When online and permitted, check for a signed newer application release and
    download an updated project HTML without replacing the existing file.

## Mapping types

Required:

- direct text content;
- yes/no visibility;
- select one child from a group;
- QR code generated from cell text;
- image replacement.

## Row and column behavior

Row filtering and row selection are separate.

- Search and filters decide what is visible.
- Selection decides which rows generate outputs.
- Hidden selected rows remain selected.
- The UI always shows total, matching, selected, and selected-but-hidden counts.

Column visibility, mapping availability, and exported data columns are also separate.

A column may remain available to mappings even when it is hidden from the grid or excluded from exported CSV.

## Manual rows

The final grid line is `+ Add row`.

Manual rows:

- use the same column schema;
- are searchable and filterable;
- can be selected for generation;
- can be edited and deleted;
- are persisted in the project.

Imported rows are retained as immutable source records. User edits are stored as overrides.

## Linked SVG behavior

The project always embeds the latest accepted SVG.

It may additionally hold a link to:

- a local file handle;
- a remote HTTPS URL;
- a Google Drive file ID.

Reload is manual. The application does not poll.

A linked source is optional and never required to open or export the project.

## Runtime modes

### Local mode

Opened as `file://`.

Available:

- local import;
- local preview;
- mappings;
- validation;
- local export;
- self-contained project save;
- linked local file reload when browser permission is available.
- manual signed update checks when networking is permitted.

The local application remains fully usable without an update check. Automatic
launch checks are optional and can be disabled; offline mode blocks them.

Unavailable:

- Google Drive authentication and Picker.

### Hosted mode

Opened from approved localhost or HTTPS origin.

Includes all local features plus Google Drive import and save.

The hosted app must not require a backend for the MVP.

## Explicitly deferred

Do not implement these until the MVP is complete and a real requirement exists:

- collaboration;
- user accounts;
- server rendering;
- webhook notifications;
- background Drive polling;
- unrestricted whole-Drive access;
- arbitrary SVG editing;
- a visual SVG designer;
- complex expression/formula mappings;
- multipage PDF unless individual-PDF export proves insufficient;
- Shared Drive support unless requested;
- a plugin system;
- a generic workflow engine;
- multiple application release channels;
- background update polling;
- silent application updates without an explicit user action.
