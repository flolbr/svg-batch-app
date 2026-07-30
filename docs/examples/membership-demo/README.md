# Membership demo

This fixture exercises the initial mapping engine without external dependencies.

## Files

- `membership-data.csv` — UTF-8 CSV with nine rows.
- `membership-data.xlsx` — the same rows in the `Customers` sheet, plus a `Mapping Guide` sheet.
- `membership-template.svg` — safe, standalone SVG with stable unique IDs.
- `expected-mappings.json` — expected mapping intent for tests or manual setup.

`expected-mappings.json` deliberately names spreadsheet columns by source
header so the fixture remains readable before import. It is not the persisted
mapping schema, which uses generated column IDs and mapping IDs.

## Supported mapping examples

| SVG target        | Column          | Mapping                     |
| ----------------- | --------------- | --------------------------- |
| `customer-name`   | `Customer Name` | Direct content              |
| `customer-city`   | `City`          | Direct content              |
| `membership-tier` | `Customer Type` | Select one child from group |
| `member-badge`    | `Show Badge`    | Yes/no visibility           |
| `document-id`     | `Document ID`   | Direct content              |
| `member-since`    | `Member Since`  | Direct content              |
| `member-note`     | `Note`          | Direct content              |
| `qr-placeholder`  | `QR Content`    | QR generation               |

The `Customer Type` values exactly match the SVG child `data-option` values: `standard`, `premium`, and `vip`.

## Suggested smoke test

1. Import `membership-template.svg`.
2. Import either data file and choose the `Customers` worksheet for XLSX.
3. Use `expected-mappings.json` as a reference and configure the mappings.
4. Preview `DOC-001`, `DOC-002`, and `DOC-003` to cover all three membership tiers.
5. Confirm that `DOC-002` hides the badge.
6. Search for `alice`, `premium paris`, or `chloe` to exercise fuzzy/accent-insensitive row search.
7. Export selected rows using `Document ID` for filenames.

## Fixture guarantees

- CSV and XLSX contain the same headers and values.
- SVG IDs are unique.
- The SVG has no scripts, event handlers, `foreignObject`, external URLs, or linked assets.
- Group options match all values present in the data.
- Output filename values are non-empty and unique.

## Integrity check

From this directory, run:

```bash
sha256sum -c SHA256SUMS
```
