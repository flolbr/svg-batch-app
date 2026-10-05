# Session handoff

Last updated: 2026-10-05

## Current task

Continue Drive acceptance testing. New user screenshot from signed-in Firefox
at localhost shows `membership-data.xlsx` imported from Drive (Customers sheet,
9 rows) and `membership-template.svg` linked from Drive. The SVG is sanitized,
renders in preview, and its comparison reports no missing/incompatible targets
and 19 new targets. A separate recovered local fixture was saved as
`Untitled project.html` in Drive's `membership-demo` folder from a temporary
single-file shell served at `http://127.0.0.1:5173/drive-test-shell.html`.
Picker reopened it and the app confirmed the HTML passed validation; the nine
rows, embedded SVG, and QR mapping were restored. Thus live localhost save and
reopen work. The exact Drive-imported XLSX/linked-SVG state has not yet been
saved, nor have repeated updates, conflicts, or the remaining matrix cases.
Prior local fallback tests mapped visibility and QR content and passed
validation; Chromium 153 Playwright verified the two-row ZIP. Earlier
CORS/referrer probes are configuration checks only.
The published `https://flolbr.github.io/svg-batch-app/` serves v0.1.2, but its
Drive controls are disabled; its inline bundles lack the OAuth client ID, API
key and Picker app ID. The production host origin is allow-listed and the key
works from that referrer, so the published artifact is missing build-time Drive
configuration. Do not claim production Drive coverage until a configured build
is prepared after localhost live acceptance.

Changed: TODO, hosted Drive test plan and this handoff. No app source changes.
`bun run verify:single` passed (2,568,300-byte self-contained build);
`git diff --check` passed. The temporary untracked `public/drive-test-shell.html`
serves that build on the allow-listed origin so browser acceptance can continue;
remove it when the localhost live tests finish. `outputs/` remains untouched.
Latest prior commit `a4a3e4b` records the live Drive import and SVG-link result.
Latest commit `4cab708` records the live Drive project round trip. Commit
`0390c87` records the production configuration finding; `3bf23f7` records the
denied-referrer check. Next, save/reopen the actual Drive-imported
workbook/SVG project, then exercise repeat-save and conflicts. Only after
localhost acceptance passes, prepare a configured production build.

Earlier fixes remain: project-bound Drive save reference (regression), OAuth
cancellation (3 unit/8 browser cases), error reporting (13 injected cases).
Renewal and all conflict choices have eight injected component cases.
Live localhost API attempt reached Picker but did not complete import. User
authorized project/credentials setup and installation of the official
downloaded CLI archive. Created owner project
`svg-batch-drive-tests-20261005` (number `21912030633`) through Cloud Shell;
Drive and Picker APIs enabled. Created browser key `svg-batch-drive-web`,
restricted to Drive/Picker and localhost:5173, 127.0.0.1:5173,
flolbr.github.io and docs.google.com referrers. Key and app number are in ignored
`.env.local` with the Web OAuth client ID. No OAuth secret stored or needed.
CLI 587.0.0 installed durably in `/home/flo/.local/share/google-cloud-sdk`,
with gcloud/gsutil/bq links in `/home/flo/.local/bin` already on zsh PATH.
Owner authentication retained in `/home/flo/.config/gcloud` (0700), selected
project verified through the local CLI. After explicit user approval, accepted
Google's API user-data policy and created Web client "SVG Batch Drive Tests".
Origins: http://localhost:5173, http://127.0.0.1:5173, https://flolbr.github.io.
App is external/testing; user requested owner email as test user and it was
added. Declared only drive.file. Console shows creation and test user success.
`bun run build` passed with real config. On 2026-10-05, localhost v0.1.2
opened Picker and the user-provided SVG was selectable, but linking failed with
`Failed to fetch`. The embedded browser blocks the `www.googleapis.com` API
host (`ERR_BLOCKED_BY_CLIENT`); shell preflight succeeded and Chromium Playwright
received a CORS-readable API 401 with a fake bearer. A CSV
selection is ambiguous because the tab restored that same CSV from local
recovery first. No Drive writes occurred. After closing that tab, a fresh
session imported the local CSV/SVG successfully (the SVG was sanitized, with 19
targets and a rendered preview), then tested badge visibility and QR mapping;
validation passed without issues. The local export download did not complete.
Need a supported browser without this API host
blocked; do not disable security protections. Production and write/reopen cases
are still pending.

Do not publish the app or mark acceptance complete before real Drive evidence.

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

Latest handoff commit: `1578b93` — current localhost fallback and next step recorded.
Test evidence: `2b660ba` — local fallback after Drive host-block recorded.
Previous test note: `506bd20` — Picker works; embedded-browser Drive API access blocked.
Setup: `4a22c88` — Web OAuth client, scope and test user configured.
Cloud setup: `4e4d7d4` — project/key and durable gcloud setup.
Previous task commit: `0e449ed` — complete Drive roundtrip, 405 tests pass.
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

Next concrete step: use the configured localhost app and execute the
Hosted Drive checklist A–F, recording live versus injected results separately.

Remaining plan gates: Edge local-file flows (runtime unavailable previously),
and hosted Drive import/save (configuration ready; live acceptance pending).
No remaining Firefox verification work. Existing outputs/ remains untouched.
