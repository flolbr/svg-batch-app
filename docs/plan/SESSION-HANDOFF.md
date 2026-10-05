# Session handoff

Last updated: 2026-10-05

## Current task

Continue Drive acceptance testing. Added a complete-state Drive roundtrip
component case: capture the actual multipart HTML upload, validate its embedded
project and reopen those bytes in a fresh App instance. Imported/manual rows,
overrides, filters, selection, accepted SVG/object selection, mappings and
font/image asset bytes/metadata survive. The OAuth token is absent from HTML.
Synthetic asset bytes test persistence only; rendering has separate coverage.

Changed: `src/App.test.tsx`, TODO and test plan. Focused roundtrip passed.
No production change. `bun run check` passed (60 files, 405 tests;
2,567,720-byte single HTML). Existing filename-regex lint warning.
`outputs/` remains untouched.

Earlier fixes remain: project-bound Drive save reference (regression), OAuth
cancellation (3 unit/8 browser cases), error reporting (13 injected cases).
Renewal and all conflict choices have eight injected component cases.
No live Google API/account tested. User is preparing a dedicated test account;
Cloud project should belong to their owner account/organization, with the test
account separate. User now authorized use of the adjacent Google Cloud Shell. Console is signed
in, with no project selected. Embedded terminal input automation failed; trying
a dedicated Cloud Shell tab in the same in-app browser. No Cloud project or
credentials changed yet. Configuration has not been supplied yet.

Next independent check: linked Drive SVG failure preservation. Real OAuth,
actual writes/versions, localhost/production matrix, file-size limits and
simultaneous-write behavior still need live evidence once configuration and
account become available.

Previous Firefox acceptance passed with Firefox 155: local Ethnocentric and
an uploaded generated font survive saved-HTML reopen without HTTP requests.
Screenshots: `/tmp/svg-firefox-fonts-8VFDJl/`. No remaining Firefox font work.

## Working behavior

User-selected fonts are embedded with optional family/style/weight metadata.
Preview font CSS shares the project metadata module. Upload uses the existing
font buffer and updates current project assets without rehydrating workspace
sources, mappings, or selection; a project switch during reading cancels upload.

PDF export outlines matching font text on export clones. Direct text offsets
apply once, opacity stays on its group, and IDs remain unique. Only masked
image/group subtrees are composited at 300 DPI; other graphics remain vector.
Ordinary PNG alpha passes through. Unsupported text layouts, vector/text masks,
and malformed image data fail visibly. Outlined text is not searchable. WOFF2
can preview but matching PDF text requires a parseable OTF, TTF, or WOFF face.
SVG exports do not embed project font bytes.

## Verification and files

Changed: App upload and regression, shared font metadata/CSS and tests, preview,
PDF outlining and tests, export converter/browser regression, related plan docs.
Focused App/preview/outline tests passed (52 tests). `bun run check` passed
(60 files, 379 tests, 2,567,534-byte self-contained build); Chromium PDF
regression with Poppler checks passed. One existing filename-regex lint warning.

Earlier real-fixture artifacts: `/tmp/senior-vector.pdf`,
`/tmp/senior-vector.png`, `/tmp/senior-font-400dpi.png`; one 1123 × 794 pt page,
about 2.95 MB, sharp headline at 400 DPI. Existing `outputs/` remains untouched.

## History and next step

Latest task commit: `0e449ed` — complete Drive project roundtrip, 405 tests pass.
Previous fix: `7d940a9` — bind Drive save destination to its project.
Previous test commit: `bd06f94` — Drive renewal and conflict state preservation.
Previous OAuth fix: `3a8ee08` — respect cancellation; 8 browser cases pass.
Previous fix: `32f3db2` — correct Drive error reporting with 13 new cases.
Previous plan commit: `5aeb533` — detail Google Drive acceptance tests.

Previous verification commit: `13cb762` — Firefox fonts through saved-project reopen.

Consolidated implementation commits, merged into local main:
- `7530b62` — embed project fonts with face metadata (376 tests and build).
- `ec47461` — export vector font text with masked artwork (379 tests, build,
  rendered Chromium PDF regression with Poppler checks).

Original branch history is preserved on
`codex/backup-project-embedded-font-before-squash` at `9a46856`.
The user explicitly authorized squashing and merging. No push requested.

Next concrete step: configure the Google test account/client and execute the
Hosted Drive checklist A–F, recording live versus injected results separately.

Remaining plan gates: Edge local-file flows (runtime unavailable previously),
and hosted Drive import/save (requires configured client and authorized account).
No remaining Firefox verification work. Existing outputs/ remains untouched.
