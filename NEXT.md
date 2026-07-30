Implement the next TODO item.

Use Terra subagents only for independent, bounded tasks with explicit file
ownership. Keep architecture, integration, and final review in the main Sol
thread. Use at most two concurrent subagents. Wait for their results, inspect
their diffs, then run bun run check.
