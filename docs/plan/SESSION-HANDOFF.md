# Session handoff

Last updated: 2026-10-05

## Current task

Continue Drive acceptance testing. OAuth denial and popup closure/failure
previously triggered an unsolicited second consent request. Three new unit
cases reproduced it; the client now requests once and lets a later action retry.
Empty prompt permits first consent; it is not silent auth.

Changed: Google client/tests, `scripts/testDriveAuthBrowser.ts`, package.json,
TODO, Drive/test plans and decisions. `bun run test:browser:drive-auth` passes
8 cases (4 each Chromium/Firefox): denial, closed/blocked popup callbacks and
blocked Google scripts; local SVG import survives and explicit retry reaches
Picker cancellation. Scripts are injected: no live Google account/API tested.
The runner builds an isolated single HTML in a temporary directory, serves it
on an ephemeral HTTP port and launches a fresh browser for each case. This
avoids observed Vite dev-server/context startup stalls; temporary files are
removed. Full `bun run check` passed (60 files, 395 tests; 2,567,552-byte build).
Existing filename-regex lint warning. `outputs/` remains untouched.

Earlier failure-message correction remains verified with 13 injected cases.
No Google configuration/account response received yet; real hosted matrix is
still blocked. Next independent tests: 401 renewal bounds, project reopen and
conflict UI/state preservation. Do not mark live OAuth or Drive writes passed.

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

Latest task commit: `3a8ee08` — respect OAuth cancellation; 8 browser cases pass.
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
