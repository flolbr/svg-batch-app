# Session handoff

Last updated: 2026-10-05

Current task: consolidate font changes into two commits, then merge into main.
Original history remains on `codex/backup-project-embedded-font-before-squash`
at `9a46856`; no push requested.

First commit: embedded user-selected fonts with family/style/weight metadata,
shared preview CSS, backward-compatible schema, and live-state-safe upload.
Metadata, preview, schema, and App upload regressions included.
`bun run check` passed (59 files, 376 tests; self-contained build).
One existing filename-regex lint warning remains.

Next: restore vector font outlining and masked-image PDF export from the
reviewed snapshot, verify full check and rendered Chromium PDF regression,
commit the second step, then merge main. Existing outputs/ stays untouched.
Firefox local-font preview remains an independent pending environment check.
