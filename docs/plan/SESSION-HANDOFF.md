# Session handoff

Last updated: 2026-10-05

## Current task

Continue Drive acceptance testing. Added eight injected component cases for
401 renewal success, second-401 stop, cancelled renewal and 403 without renewal.
Failure preserves the imported spreadsheet, row override and selection. Four
conflict choices after opening Drive project HTML verify state, no-write paths,
POST versus PATCH and uploaded local content. No new defect or production edit.

Changed: `src/App.test.tsx`, TODO and test plan. Focused cases passed (8).
`bun run check` passed (60 files, 403 tests; 2,567,552-byte self-contained HTML).
Only the existing filename-regex lint warning remains. Unrelated formatting
changes removed; `outputs/` remains untouched.

Earlier OAuth fix is covered by 3 cancellation unit cases and 8 Chromium/
Firefox cases via `bun run test:browser:drive-auth` with injected Google scripts.
Failure-message correction has 13 injected cases. All these are simulated
responses, not live Google acceptance. No configuration/account response yet.

Next: exercise Drive HTML roundtrip with complete data/SVG/mappings/assets and
linked SVG failure preservation where existing component coverage is weak.
Real Google OAuth, actual Drive writes/versions, production-origin matrix,
size boundaries and simultaneous-write behavior still need live evidence.

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

Latest task commit: `bd06f94` — verify Drive renewal and conflict state preservation.
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
