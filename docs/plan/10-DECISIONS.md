# 10 — Decisions

Keep this file concise. Record decisions, not discussion.

## 2026-09-20

### Bento-inspired signed application updates

Use [Bento](https://github.com/nyblnet/bento) as architectural inspiration for
the single-file application and update model.

Ship one stable signed release channel. The application verifies an ECDSA P-256
manifest, application identity, strictly newer version, and release SHA-256
before inserting the current validated project into the new shell.

Applying an update downloads a new HTML file and retains the old file as
rollback. Update checks are optional, disclose network use, send no project
data, and are blocked by offline mode.

Keep the signing key offline. Do not add a runtime crypto dependency, background
polling, delta updates, multiple channels, or a generic updater framework.

## 2026-07-31

### Batch execution

Keep row export sequential. Each row finishes before the next starts.

Add concurrency only after measurement shows a material bottleneck.

## 2026-07-30

### One self-contained HTML project

Accepted.

The HTML embeds the application and current project snapshot.

### Google Drive mode

Drive works only from an approved localhost or HTTPS origin.

The local `file://` core remains functional without Drive.

### Linked SVG

Accepted as an optional source reference.

The project always keeps an embedded SVG snapshot.

Reload is manual through a button. No polling or webhooks.

### UI library

Use Mantine for standard controls and layout primitives.

Reason: less local component code and no component-generation workflow.

### Data grid

Use TanStack Table. Use TanStack Virtual only when the dataset size requires it.

### SVG tree

Implement a small custom accessible tree.

Do not add a full tree library unless measured requirements exceed the custom implementation.

### State and validation

Use Zustand and Zod.

Do not add Redux or a form framework without a concrete need.

### Spreadsheet engine

Use SheetJS Community Edition from the official distribution tarball.

Persist normalized rows, not the original workbook binary.

### PDF

Use jsPDF with `svg2pdf.js`.

Export individual PDFs first. Multipage PDF is deferred.

### Search

Fuzzy search applies to imported row values.

Column-name search is not a product requirement.

### Selection

Filtering and row selection are independent.

Selected rows stay selected when hidden by filters.

### Images

Image replacement is part of the MVP mapping set.

Prefer embedded project assets initially.

### Backend

No backend for MVP.

Add one only when a requirement cannot be met safely in the browser.
