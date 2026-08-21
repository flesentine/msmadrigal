#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
say() { printf '\n==> %s\n' "$*"; }

command -v npm >/dev/null 2>&1 || fail "npm is required."

if [[ ! -f package-lock.json ]]; then
  say "Generating local package-lock for security audit"
  npm install --package-lock-only --ignore-scripts
fi

say "Verifying patched transitive dependency"
TAR_VERSION="$(node -e "try { console.log(require('tar/package.json').version) } catch (_) { process.exit(1) }" 2>/dev/null || true)"
if [[ -z "$TAR_VERSION" ]]; then
  npm install --ignore-scripts
  TAR_VERSION="$(node -e "console.log(require('tar/package.json').version)")"
fi
[[ "$TAR_VERSION" == "7.5.22" ]] || fail "Expected tar 7.5.22, found ${TAR_VERSION:-missing}. Run npm install."
printf 'tar: %s\n' "$TAR_VERSION"

say "Running npm audit (moderate or higher fails)"
npm audit --audit-level=moderate
printf 'npm security audit: OK\n'
