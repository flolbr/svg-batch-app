# 09 — Test plan

## Unit tests

Required for pure logic:

- header normalization;
- stable row construction;
- effective rows and overrides;
- fuzzy-search normalization;
- structured filters;
- row selection commands;
- filename sanitation and collisions;
- mapping schemas;
- each mapping implementation;
- validation rules;
- project serialization;
- project migrations;
- linked-SVG compatibility comparison.
- semantic version comparison;
- signed update-manifest verification;
- release artifact hash and shell validation;
- project splicing into a verified release shell.

Use small fixtures and explicit expected objects.

## Component tests

Use React Testing Library for:

- data-panel search and counts;
- row selection persistence through filters;
- `+ Add row`;
- SVG tree keyboard navigation;
- mapping form behavior;
- validation report;
- Drive-disabled state in local mode.
- update available/current/error states and offline opt-out.

Do not test Mantine internals.

## Integration fixtures

Use [`../examples/membership-demo/`](../examples/membership-demo/) as the
canonical end-to-end fixture for local spreadsheet import, worksheet choice,
SVG import, core mappings, preview, search, selection, filename choice, and
export. Its CSV and XLSX customer data must normalize to equivalent displayed
rows. `expected-mappings.json` records expected intent by source header; it is
not an app-importable persisted mapping schema.

Keep small, narrow edge-case fixtures under:

```text
test/fixtures/
  spreadsheets/
    basic.csv
    duplicate-headers.xlsx
    dates-and-leading-zeroes.xlsx
  svg/
    basic.svg
    group-options.svg
    text-overflow.svg
    embedded-image.svg
    incompatible-update.svg
```

Spreadsheet import coverage must include the membership CSV's UTF-8 BOM and
blank note cell, plus the XLSX's secondary `Mapping Guide` worksheet.

## Browser smoke flows

At minimum:

### Local project

1. open built HTML with no network;
2. import the membership SVG and CSV or XLSX fixture;
3. map at least one text target and the QR target;
4. preview one standard, premium, and VIP row;
5. confirm the `DOC-002` badge is hidden;
6. search for `chloe` and confirm `Chloé Petit` matches;
7. select two rows and export a ZIP using `Document ID` filenames;
8. save project HTML;
9. reopen saved HTML;
10. confirm data and mappings restore.

### Firefox font preview and saved-project reopen

Run `bun run test:browser:fonts` against the self-contained build. Requires
Playwright Firefox and an installed Ethnocentric font; `SVG_BATCH_FIREFOX`
can select a runtime and `SVG_BATCH_LOCAL_FONT` can select another installed
family. No runtime installation or font download is performed by the test.

The regression uploads an SVG with local-font text and an initially unavailable
font family. It checks local preview metrics against the top-level browser,
uploads a generated font, and verifies its expected glyph width differs from
fallback. The iframe retains `sandbox="allow-same-origin"` without scripts.
Save project must download a complete HTML with exact font bytes and face
metadata; reopen in a fresh browser context must reproduce both faces.
The whole flow must make no HTTP requests. Set
`SVG_BATCH_KEEP_FONT_ARTIFACTS=1` to retain screenshots and the saved HTML for
visual inspection; otherwise temporary files are cleaned up.

### Linked local SVG

1. link SVG;
2. change target-safe content externally;
3. click reload;
4. apply;
5. save project;
6. reopen and confirm snapshot.

### Hosted Drive

Status: configuration is complete; localhost live acceptance is in progress.
The earlier embedded-browser attempt opened Picker but blocked
`www.googleapis.com` (`ERR_BLOCKED_BY_CLIENT`). The later signed-in Firefox
session verified file import and SVG linking; save/reopen and other acceptance
cases remain unverified. Phase 8 implementation/unit tests are separate.

Live import evidence, 2026-10-05: the user-selected test workbook
`membership-data.xlsx` loaded from Drive on `http://127.0.0.1:5173/` with two
worksheets; the Customers sheet displayed 9 rows. The linked SVG
`membership-template.svg` also appeared in the SVG panel with sanitized/Drive
status and a Reload link. Its preview rendered, and the comparison reported
zero missing and zero incompatible targets (19 new targets because this fresh
project had no mappings). This verifies live spreadsheet import and Drive SVG
linking in the signed-in Firefox session. Mapping, save-to-Drive, and reopen
from Drive remain unverified in that session.

Live save/reopen evidence, 2026-10-05: the Vite dev shell correctly rejected
Save to Drive because its `/src/main.tsx` entry is not a portable project.
After `bun run verify:single` passed, the standalone `dist/index.html` was
served temporarily at the same allow-listed origin as
`/drive-test-shell.html`. In the signed-in browser, a recovered test project
with the nine-row membership CSV, embedded membership SVG, and a valid QR
mapping was saved into the Drive `membership-demo` folder as
`Untitled project.html`. Picker then reopened that file; the app confirmed
“The self-contained project passed validation.” The reopened UI showed the
nine rows, SVG preview, and valid QR mapping. This verifies a live localhost
Drive HTML round trip for the recovered fixture state. It does not verify
saving the separate Drive-imported XLSX/linked-SVG session, later updates,
conflict handling, or production/other-browser behavior.

Live browser evidence, 2026-10-05: localhost `http://127.0.0.1:5173/`,
app v0.1.2, configured Cloud test project. Google Identity/Picker loaded and
Picker presented Drive; filtering to the user-provided `membership-template.svg`
found one result. Selecting it reached `Drive SVG link failed / Failed to fetch`;
no SVG was applied. A separate top-level browser navigation to
`https://www.googleapis.com/drive/v3/files/example?fields=id` was blocked by the
embedded browser (`net::ERR_BLOCKED_BY_CLIENT`). From Chromium 153.0.8010.52
using Playwright at the same origin, a cross-origin Drive GET with an
intentionally invalid bearer returned Google's readable JSON 401 (`type: cors`);
the unauthenticated GET returned the expected Google JSON 403. The shell CORS
preflight also returned 200 with `authorization` allowed. This establishes that
standard Chromium can reach the API and pass CORS, but not authenticated access
or real app import/save. The embedded browser remains blocked.
The configured API key also returned the same CORS-readable Google 401 when
used from its allowed `127.0.0.1:5173` origin with the fake bearer, confirming
that Google accepted the key/referrer and reached OAuth authentication. No
Drive file was read or changed by these probe requests.
Referrer restriction check, 2026-10-05: without an OAuth header, the same key
from allowed port 5173 reached Drive and returned 404 for the deliberately
nonexistent file ID `example`. From unregistered port 5174, Google returned
CORS-readable 403 `Requests from referer ... are blocked.` This confirms the
key is restricted to configured referrers; no real Drive file was read.

Production configuration check, 2026-10-05: the URL
`https://flolbr.github.io/svg-batch-app/` returns HTTP 200 and app v0.1.2, but
its Drive controls are disabled with
`Google Drive is not configured for this hosted origin.` Inspection of the
inline bundles found no OAuth client ID, browser API key or configured Picker
app ID, although the production origin is listed. A probe with the configured
key from that allowed origin still reached Drive (404 for dummy ID `example`),
but this does not enable the deployed app. Production Drive acceptance requires
a configured hosted build and remains untested.
A previous Picker CSV selection cannot be counted as a live import because the
localhost tab had restored the same CSV from local recovery before the selection.
No test files were written to Drive. The localhost tab was closed after the
attempt. Repeat in a supported local browser where `www.googleapis.com` is not
blocked, without lowering browser security settings. Production and save/reopen
remain untested.

Local-core fallback evidence, 2026-10-05: after closing the failed Drive session,
a fresh localhost tab restored only the synthetic local CSV fixture. Before any
Drive action its document contained only the Vite and app scripts. Importing the
local `membership-template.svg` sanitized it, found 19 mapping targets, and
rendered the preview; selecting DOC-001 worked. This verifies that the failed
remote request did not prevent core local use, but it does not resolve the
embedded browser's API host block or count as a Drive import.

Further local UI evidence, 2026-10-05: reimported the membership CSV and SVG in
a fresh localhost session. The `Show Badge` visibility mapping hid the badge
for DOC-002 (`no`) and showed it for DOC-001 (`yes`). The QR target accepted
`QR Content` and was marked valid; validation reported no issues for the
selected row. The embedded browser did not complete its local download event.
To verify the app path independently of that browser limitation, Chromium
153.0.8010.52 with Playwright imported the same fixtures, mapped customer name,
membership tier, badge visibility and QR content, validated DOC-001/002, then
downloaded the ZIP. Archive assertions confirmed `row-1.svg`, `row-2.svg` and
`manifest.json`, successful manifest entries without warnings, correct names
and exclusive tiers per row, the DOC-002 badge hidden, and QR vector paths in
both outputs. These local checks do not count as Drive acceptance.

Automated evidence, 2026-10-05: `src/drive/driveFiles.test.ts` injects structured
403 quota/permission/export-size failures, 413 ZIP uploads, 429/503 responses,
failed metadata reads (no write) and ambiguous upload failures (no replay).
Four new assertions failed before the error-message correction. These are
function tests with simulated responses, not live Google/browser acceptance.

Component evidence, 2026-10-05: eight parameterized cases in `src/App.test.tsx`
cover successful 401 renewal, a second 401, cancelled renewal and a 403 without
renewal; failures preserve the imported data, row override and selection.
They also open project HTML through the Drive path and exercise copy/reload/
overwrite/cancel conflicts, checking resulting state, write count, method and
uploaded local content. These use injected callbacks/responses in jsdom;
real popup behavior, Drive versions and the concurrency race remain unverified.

The complete-state App roundtrip case captures the multipart HTML sent on
Drive creation, validates its embedded project, then reopens those bytes in a
fresh App instance through the Drive path. It compares imported/manual data,
row overrides, filters, selected IDs, SVG/object selection, mappings and font/
image asset bytes/metadata, and checks that the OAuth token is absent from HTML.
Asset payloads are small synthetic persistence fixtures; this case does not
verify font/image rendering or the actual Google upload service.

Run `bun run test:browser:drive-auth` for repeatable Chromium/Firefox checks of
consent denial, popup closure/failure, Google script blocking, local SVG import
after failure and successful authorization followed by Picker cancellation on
an explicit retry. Requires installed Playwright Firefox and Chromium at
`/usr/bin/chromium` (override with `SVG_BATCH_CHROMIUM`). The real app runs on
an ephemeral local HTTP origin with an isolated single-file build, test
identifiers and intercepted Google scripts;
no Google account/API is contacted. This does not verify actual popup policy
or production OAuth configuration.

#### Preparation and execution matrix

1. Use a dedicated test account and disposable folder in My Drive. Enable Drive
   API and Google Picker API in the Google Cloud project; configure the web
   OAuth client, consent audience/test user, and restricted browser API key.
2. Configure all four variables from [08 — Google Drive](08-GOOGLE-DRIVE.md#configuration).
   Use the Google Cloud project number for `VITE_GOOGLE_APP_ID`. Register the
   exact localhost origin (including port) and production HTTPS origin in both
   OAuth configuration and the app allow-list; allow the corresponding web
   referrers for the API key. Rebuild/restart after configuration changes.
3. Upload copies of the membership SVG, CSV and XLSX fixtures, a small XLS file,
   and a native Google Sheet with known rows, accents, blanks and leading zeros.
   Prepare malformed SVG/project HTML, compatible/incompatible SVG revisions,
   and a project containing an uploaded font and image for size checks.
4. Run the cases below on localhost and production HTTPS in current Chrome.
   Repeat OAuth, Picker, save/reopen, cancellation and recovery in Edge and
   Firefox. Record browser/version, origin, app version/commit, date and result
   per case. Mark unavailable configurations/browsers blocked, never passed.
5. Use Browser Harness for real login, consent and permission exploration.
   Use Playwright for repeatable app acceptance and injected failures; label
   mocked results separately from live API results. Any reproducible browser
   defect needs a Playwright regression before it is considered fixed.

#### A. First connection, cancellation and isolation

1. Open a fresh hosted session and import a local fixture before any Drive
   action. Expect local features to work and no Google scripts/API requests.
2. Click Open from Google Drive. Complete consent and select a file. Expect
   only `drive.file` to be requested and the chosen file to load.
3. In fresh attempts, deny consent, close the OAuth popup, then cancel Picker.
   Expect no project changes or writes, no endless spinner/repeated popup, and
   a subsequent user-initiated attempt to remain possible.
4. Block the Google script hosts in a fresh browser context. Attempt Drive,
   then import, preview, export and save locally. Expect a recoverable Drive
   error and a working local core. Unblock and retry Drive successfully.
5. Open the saved HTML through `file://`, then test an unlisted hosted origin.
   Expect disabled Drive controls with an explanation and no OAuth attempt.

#### B. Import, save and reopen

1. Import each spreadsheet format and the native Sheet through Picker. Compare
   displayed cells and worksheet choices against the source/local import;
   native Sheets must use the XLSX import path without modifying the Sheet.
2. Import the SVG; create text/QR mappings, a row override, a manual row,
   selection and a filter. Upload a font. Record this expected project state.
3. Choose Save to Drive and select the disposable folder. Expect one project
   HTML with the correct name/folder. Record its file ID and version privately.
   Repeat from a fresh project with folder selection cancelled: no file created.
4. Close the app and open a fresh hosted session. Use Open from Google Drive
   to select that HTML; this loads project data into the hosted app. Verify
   SVG, mappings, data edits, selection, filters and embedded font restore.
5. Change a cell and save again. Expect the same Drive file ID, a newer version,
   and no duplicate. Reopen in another fresh session and verify the new value.
   Also switch to a different project before saving: expect folder selection
   and a new file ID, with the previously opened Drive project unchanged.
   A component regression covers this project-ID binding with injected Drive
   responses; it failed before the destination-binding correction.
6. Export two selected rows to Drive. Expect a ZIP in the selected folder;
   download and inspect entries, filenames and enabled SVG/PDF/CSV content.
   Unresolved validation errors must block export unless partial export was
   explicitly selected. Cancel folder selection and verify no upload occurs.
7. Download the project HTML and reopen locally with network disabled. Verify
   the same state/preview and working local export. Inspect saved project JSON
   and browser persistence for absence of OAuth tokens; do not copy tokens into
   logs, screenshots or test reports.
8. Attempt malformed SVG and project HTML imports. Expect validation errors
   and preservation of the previously accepted workspace.

#### C. Conflicts between two sessions

Open the same disposable project in sessions A and B. Make different cell edits;
save A, then save B. Repeat this setup independently for each choice below.

| Choice in B | Expected result |
| --- | --- |
| Save a copy (default) | New file ID containing B's state; original retains A's state. Record the copy's actual destination. |
| Reload | B displays A's saved state; no write to Drive. |
| Overwrite | Original file ID now contains B's state after explicit choice. |
| Cancel / close dialog | Drive retains A's state; B keeps its unsaved edits. |

Read the resulting files in a fresh session to verify each result. Also stage a
write from A after B's metadata check but before B's upload, using controlled
request interception in Playwright. Record the current read-then-write race:
version comparison is not an atomic lock. Do not claim simultaneous-write
protection from the ordinary conflict test; record any lost update as a known
limitation requiring a separate resolution/explicit release decision.

#### D. Expiration, revoked access and interrupted requests

1. After a successful connection, let the token expire and trigger another
   action. Also inject a single 401 for repeatable coverage. Expect at most one
   renewal/retry, preservation of edits, and a usable retry path if the browser
   blocks the popup. Record whether a fresh user click is needed.
2. Revoke the app's grant in the test account and retry; separately permanently
   delete a disposable linked file. Expect recoverable access/missing errors,
   no replacement of local state and a working local save. Reauthorize/select
   an available file and verify recovery.
3. Inject 403 permission/quota errors, 429 and 5xx responses, then interrupt a
   download and upload. Expect accurate errors, cleared busy state and retained
   edits. Do not mislabel every 403 as an oversized Sheet.
4. For an upload with a lost response, inspect Drive before manually retrying:
   the server may have saved it. Record duplicates or ambiguous outcomes; do
   not infer failure or success only from the missing client response.

#### E. Linked Drive SVG

1. Link a disposable SVG and reload without changes: expect a no-op.
2. Replace its Drive content while retaining target IDs. Reload, cancel once,
   then repeat and apply. Expect changes only after confirmation and preserved
   compatible mappings. Undo must restore the previous snapshot/mappings.
3. Repeat with missing targets and incompatible target types. Expect the
   compatibility report to identify affected IDs and no silent replacement.
4. Try invalid SVG content, revoked access and a permanently deleted file.
   Expect an explicit failure and continued use of the embedded snapshot.
5. Save after an accepted update and reopen: expect the accepted snapshot and
   source reference to survive without automatic background reload.

#### F. File sizes and release evidence

1. Upload/reopen a small project, then projects/ZIPs below and above 5 MB using
   embedded assets. Record exact byte sizes, elapsed time and observed failures.
   The current simple/multipart upload path must not be described as resumable;
   larger-file support or an explicit product limit remains to be resolved if
   acceptance fails. See Google's [upload guidance](https://developers.google.com/workspace/drive/api/guides/manage-uploads).
2. Test a native Sheet whose XLSX export succeeds and one exceeding the export
   endpoint's 10 MB output limit. Expect a specific size error and preserved
   current data for the latter. Label simulated limit responses separately if
   no real oversized fixture is available. See [files.export](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export).
3. Keep a short result table: case, origin/browser, live or injected, expected
   result, actual result, pass/fail/blocked and sanitized evidence/defect link.
   Record any untested size range or concurrency limitation explicitly.
4. Run `bun run check` after any fixes, plus the added Playwright regressions.
   Mark the hosted Drive release gate complete only after the live matrix and
   failure cases have evidence and unresolved failures are fixed or explicitly
   accepted. Documentation alone does not complete that gate.

### Application update

1. open a previous release containing a representative saved project;
2. check the signed static manifest and offer the newer version;
3. show the offered version and release notes;
4. download a new HTML containing the unchanged project snapshot;
5. reopen it and confirm the newer application version plus restored state;
6. confirm the original file remains usable as rollback;
7. repeat with offline mode and confirm no update request occurs.

The release-channel rehearsal must also reject a tampered manifest, tampered
artifact, wrong application ID, same or older version, malformed application
shell, and unsafe project-block content. It uses a disposable signing key and
publishes nothing.

### Pages and GitHub Release publication

1. Build and sign the exact single-file artifact locally with the offline key.
2. Publish the signed manifest and immutable versioned artifact to GitHub Pages.
3. Attach the byte-identical artifact to the matching GitHub Release.
4. Fetch the Pages manifest and artifact from the `file://` application and
   verify the signature and SHA-256 hash.
5. Compare the served Pages hash with the GitHub Release asset hash.
6. Open the previous published application, apply the update, and confirm the
   project state is unchanged.
7. Confirm the previous file remains usable and no unsigned or altered asset is
   accepted.

The rehearsal must fail closed when Pages is unavailable, rewrites signed
bytes, or the GitHub Release asset differs. CI may deploy signed bytes but must
not receive the private signing key.

## Performance checks

Record approximate timings and memory behavior for:

- 100 rows;
- 1,000 rows;
- 10,000 rows;
- 100 generated PDFs.

Do not optimize without evidence.

## Release command

```bash
bun run check
```

A phase is not complete if this command fails for reasons introduced by that phase.
