# Session handoff

Last updated: 2026-10-05

## Current task

Font branch review, two-commit consolidation, and merge into local main complete.

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

Consolidated implementation commits, merged into local main:
- `7530b62` — embed project fonts with face metadata (376 tests and build).
- `ec47461` — export vector font text with masked artwork (379 tests, build,
  rendered Chromium PDF regression with Poppler checks).

Original branch history is preserved on
`codex/backup-project-embedded-font-before-squash` at `9a46856`.
The user explicitly authorized squashing and merging. No push requested.

Next independent check: Firefox local-font preview requires a Firefox runtime.
No remaining work for this review/merge. Existing outputs/ remains untouched.
