# Session handoff

Last updated: 2026-07-30

## Current task

No implementation task is active. The handoff package and starter shell are prepared.

## What exists

- Product and implementation plan.
- Agreed stack.
- UI reference image.
- Bun setup script.
- Minimal Vite + React + Mantine starter.
- Single-file Vite build configuration.
- Starter smoke test.

## What does not exist

No product functionality is implemented yet:

- no spreadsheet parsing;
- no SVG import;
- no mappings;
- no preview;
- no project persistence;
- no export;
- no Google Drive integration.

## Next concrete step

Start `Phase 1 — Application shell` in `00-TODO.md`:

1. mark the first Phase 1 item `[-]`;
2. implement the three-panel layout;
3. keep the content static;
4. verify it matches `assets/ui-reference.png`;
5. update this file and the TODO.

## Files most likely to change next

- `src/App.tsx`
- `src/styles.css`
- new small layout components under `src/ui/`

## Tests currently expected

- starter render test;
- `bun run build:single`.

## Known constraints

- Google Drive requires hosted mode.
- The local core must work from `file://`.
- The project must retain an embedded SVG snapshot.
- Manual reload is sufficient; no polling or webhook system is planned.
