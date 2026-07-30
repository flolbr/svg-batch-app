#!/usr/bin/env bash
set -euo pipefail

# Expected/preinstalled development tools:
# - bun (required)
# - bash and git (expected)
# - curl, python3, jq, and rg/ripgrep (useful but not required by this script)
#
# The script intentionally does not install system packages or Bun itself.
# It only initializes this repository and installs JavaScript dependencies.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v bun >/dev/null 2>&1; then
  echo "Error: Bun is required but was not found in PATH." >&2
  exit 1
fi

echo "Using $(bun --version | sed 's/^/Bun /')"

runtime_packages=(
  react
  react-dom
  @mantine/core
  @mantine/hooks
  @tabler/icons-react
  @tanstack/react-table
  @tanstack/react-virtual
  fuse.js
  zustand
  zod
  qrcode
  jspdf
  svg2pdf.js
  jszip
  dompurify
  idb
)

dev_packages=(
  typescript
  vite
  @vitejs/plugin-react
  vite-plugin-singlefile
  @types/react
  @types/react-dom
  @types/node
  @types/qrcode
  vitest
  jsdom
  @testing-library/react
  @testing-library/jest-dom
  @testing-library/user-event
  oxlint
  prettier
)

echo "Installing runtime dependencies..."
bun add "${runtime_packages[@]}"

# SheetJS Community Edition is installed from the official tarball rather than
# the stale npm registry package. Keep this version explicit and update it only
# as a deliberate dependency change.
echo "Installing SheetJS Community Edition..."
bun add "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"

echo "Installing development dependencies..."
bun add --dev "${dev_packages[@]}"

echo "Running smoke checks..."
bun run build:single
bun run test

cat <<'EOF'

Setup complete.

Next:
  bun run dev

Before implementing:
  1. Read AGENTS.md
  2. Read docs/plan/00-TODO.md
  3. Mark one task as in progress
  4. Update docs/plan/SESSION-HANDOFF.md as work advances

Commit bun.lock after the first successful setup.
EOF
