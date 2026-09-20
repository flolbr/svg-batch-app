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

### Linked local SVG

1. link SVG;
2. change target-safe content externally;
3. click reload;
4. apply;
5. save project;
6. reopen and confirm snapshot.

### Hosted Drive

1. open hosted app;
2. authenticate;
3. import a Drive SVG and Sheet;
4. save project to Drive;
5. reopen through hosted app;
6. update same file;
7. test a conflict.

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
