# Session handoff

Last updated: 2026-10-05

## Current task

Continue Drive acceptance testing. Found and fixed a stale save destination:
after opening Drive project A and switching to a different project B, save
could update A's file. Runtime Drive references now carry the accepted project
ID; B must choose a folder/create a file. Same-project repeated saves still
update their existing file. The component regression failed before the fix.

Changed: App, App test, TODO, Drive/test plans and decisions.
Tests: 13 focused Drive cases passed; `bun run check` passed (60 files,
404 tests; 2,567,720-byte self-contained HTML). Existing filename-regex lint
warning only. `outputs/` remains untouched.

Earlier coverage: eight component cases for 401 renewal and conflict choices;
three OAuth cancellation unit cases and eight Chromium/Firefox injected-script
browser cases; 13 error-reporting cases. No live Google API/account tested.
User is preparing a dedicated account and asked about Cloud ownership: advised
Cloud project on their owner account/organization, test user separate. No
configuration supplied yet; live localhost/production acceptance remains blocked.

Next independent check: complete project Drive save/reopen roundtrip with
SVG, mappings, data edits/selection and embedded assets. Actual OAuth, Drive
writes/versions, production matrix, size boundaries and concurrency still need
live evidence after configuration/account become available.

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

Latest task commit: `7d940a9` — bind Drive save destination to its project.
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
