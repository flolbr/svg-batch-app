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

Do not test Mantine internals.

## Integration fixtures

Create:

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

## Browser smoke flows

At minimum:

### Local project

1. open built HTML with no network;
2. import SVG and CSV;
3. map one text and one QR;
4. select two rows;
5. export ZIP;
6. save project HTML;
7. reopen saved HTML;
8. confirm data and mappings restore.

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
