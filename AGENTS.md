# AGENTS.md

## First actions in every session

Read these files before changing code:

1. `docs/plan/00-TODO.md`
2. `docs/plan/SESSION-HANDOFF.md`
3. The implementation document relevant to the current task
4. `docs/plan/10-DECISIONS.md`

Do not rely on remembered context when the documents answer the question.

## Working rule

**KISS is the rule. Less code is easier to review, test, and maintain.**

Do not be overcomplicated or over-zealous.

- Solve the requirement that exists now.
- Do not create abstractions, services, hooks, wrappers, registries, factories, or generic frameworks that are used once unless they remove obvious complexity immediately.
- Do not add features because they might be useful later.
- Do not build a design system. Use Mantine directly and add small CSS modules only where needed.
- Do not wrap a library component only to rename its props.
- Prefer plain functions and explicit data flow.
- Prefer one readable implementation over several layers of indirection.
- Keep the SVG object tree custom and small. Add virtualization only after a measured performance problem.
- Do not add a backend unless a requirement cannot be met without one.
- Google Drive is an optional hosted adapter. The local core must remain independent of it.

## TODO discipline

`docs/plan/00-TODO.md` is the source of truth for progress.

Before starting a task:

- mark exactly one item as `[-]`;
- add a short note if the implementation differs from the plan.

After completing a task:

- change it to `[x]`;
- add the main files changed;
- record tests run;
- leave remaining work unchecked.

Do not mark an item complete when only the happy path exists.

Use these states:

- `[ ]` not started
- `[-]` in progress
- `[x]` complete
- `[!]` blocked, with a brief reason

## Git commits

Commit completed work as development advances.

- Make reasonably sized commits focused on one feature, fix, or coherent implementation step.
- Prefer several reviewable commits over one large catch-all commit.
- Do not split work into artificial micro-commits that provide no useful review boundary.
- Do not mix unrelated refactors, formatting, documentation, and feature work in the same commit.
- Include required tests and directly related documentation updates in the same commit as the feature they support.
- Run the relevant tests before committing. Do not knowingly commit a broken build or failing tests.
- Before committing, inspect `git diff` and `git status` so unrelated or generated files are not included accidentally.
- Use clear imperative commit messages, for example:
  - `feat: add spreadsheet row filtering`
  - `feat: implement SVG text mapping`
  - `fix: preserve selected rows through filtering`
  - `docs: update Drive integration plan`
- Commit after a coherent TODO item or meaningful sub-item is complete, not only at the end of an entire phase.
- Do not rewrite, squash, amend, or force-push existing commits unless explicitly instructed.
- If unrelated user changes are present, leave them untouched and commit only files belonging to the current task.

Record the latest commit hash and summary in `docs/plan/SESSION-HANDOFF.md` before ending a session.

## Context compaction

Long agent sessions may lose earlier context. Keep `docs/plan/SESSION-HANDOFF.md` current.

Update it:

- after a meaningful milestone;
- before ending a session;
- before a likely context reset;
- whenever a decision changes.

It must state the current task, what works, what is incomplete, files changed, tests run, and the next concrete step.

Do not duplicate the full plan there. Keep it as a concise operational handoff.

## Scope control

The MVP is defined in `docs/plan/01-CONTEXT-AND-SCOPE.md`.

Before adding a dependency or feature, ask:

1. Is it required by an unchecked MVP item?
2. Does an installed dependency already solve it?
3. Can it be implemented clearly in fewer than roughly 50 lines?
4. Will this make the single-file build materially larger or less reliable?

If the answer does not justify the change, do not add it.

## Implementation conventions

- React + TypeScript + Vite.
- Bun is the package manager and task runner.
- Mantine supplies standard UI controls.
- TanStack Table and TanStack Virtual supply the data grid primitives.
- Zustand holds application state.
- Zod validates persisted project data.
- Keep domain logic outside React components when it is independently testable.
- Keep imported source data immutable; store edits as row overrides.
- Use stable generated row IDs. Never use table indexes as persistent IDs.
- Treat imported SVG as untrusted.
- Never store OAuth access tokens in the project HTML.
- Never silently replace a linked SVG when mappings become incompatible.
- Never export with unresolved validation errors unless the user explicitly chooses a clearly labeled partial export.

## Testing

Run the narrowest relevant test while developing, then before marking a phase complete run:

```bash
bun run check
```

Core mapping, filtering, filename, validation, serialization, and project migration logic must have unit tests.

### Browser testing

Use browser tests only for flows that cannot be tested reliably at the function/component level.

Use Playwright for repeatable acceptance and regression tests.

Browser Harness may be used for exploratory UI checks, real-browser
permission flows, Google Drive authentication, and debugging unexpected
browser state.

When Browser Harness discovers a reproducible defect, add a Playwright
test before considering the defect fixed.

## Documentation

When implementation behavior intentionally changes:

- update the relevant plan document;
- update `docs/plan/10-DECISIONS.md` when a decision changes;
- update `00-TODO.md`;
- update `SESSION-HANDOFF.md`.

Do not write speculative documentation for features that are not being built.
