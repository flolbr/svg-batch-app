# SVG Batch Generator — implementation handoff

This repository is a planning-first starter for a browser application that:

- imports an SVG template and spreadsheet data;
- maps SVG objects to spreadsheet columns;
- previews a selected row;
- searches, filters, edits, and selects rows;
- generates SVG and PDF outputs;
- saves the whole project as one self-contained HTML file;
- optionally opens and saves files through Google Drive when hosted on an approved origin;
- keeps an embedded SVG snapshot and can manually reload a linked SVG source.

## Start here

1. Read [`AGENTS.md`](AGENTS.md).
2. Read [`docs/plan/00-TODO.md`](docs/plan/00-TODO.md).
3. Read [`docs/plan/01-CONTEXT-AND-SCOPE.md`](docs/plan/01-CONTEXT-AND-SCOPE.md).
4. Run:

```bash
chmod +x init.sh
./init.sh
bun run dev
```

The setup script installs the agreed core stack with Bun and performs a smoke build.

## Important constraint

The core app must work from a local `file://` HTML document. Google Drive features are enabled only when the same build is served from an approved `http://localhost` or HTTPS origin.

## UI target

The intended layout and visual density are shown in:

[`docs/plan/assets/ui-reference.png`](docs/plan/assets/ui-reference.png)

## Development example

The self-contained membership fixture set is documented in:

[`docs/examples/membership-demo/`](docs/examples/membership-demo/)
