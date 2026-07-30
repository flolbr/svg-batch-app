# Session handoff

Last updated: 2026-07-30

## Current task

No implementation task is active. The README setup and starter shell have been
verified against the current dependency versions.

## What exists

- Product and implementation plan.
- Agreed stack.
- UI reference image.
- Bun setup script.
- Installed dependency manifest and `bun.lock`.
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

- `bun run check` passes;
- Browser Harness confirmed the starter shell at `http://localhost:5173/`.

## Files changed during setup verification

- `package.json`
- `bun.lock`
- `src/vite-env.d.ts`
- `vitest.setup.ts`
- `.gitignore`
- `docs/plan/00-TODO.md`
- `docs/plan/SESSION-HANDOFF.md`

## Known constraints

- Google Drive requires hosted mode.
- The local core must work from `file://`.
- The project must retain an embedded SVG snapshot.
- Manual reload is sufficient; no polling or webhook system is planned.
