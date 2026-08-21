#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOCAL_CONFIG="ios-config/Signing.local.xcconfig"
TEAM_ID="${1:-${APPLE_TEAM_ID:-}}"

fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
say() { printf '\n==> %s\n' "$*"; }

[[ "$(uname -s)" == "Darwin" ]] || fail "Apple signing setup must run on macOS."
command -v security >/dev/null 2>&1 || fail "macOS security tool is unavailable."

if [[ -z "$TEAM_ID" ]]; then
  if [[ -f "$LOCAL_CONFIG" ]]; then
    CURRENT="$(awk -F= '/^[[:space:]]*DEVELOPMENT_TEAM[[:space:]]*=/{gsub(/[[:space:]]/, "", $2); print $2; exit}' "$LOCAL_CONFIG")"
    if [[ -n "$CURRENT" ]]; then
      printf 'Apple Development Team: %s\n' "$CURRENT"
      printf 'Local signing config: %s\n' "$LOCAL_CONFIG"
      exit 0
    fi
  fi

  say "Installed code-signing identities"
  security find-identity -v -p codesigning || true
  cat <<'EOF'

No local Apple Team ID is configured yet.

Find your Team ID in Apple Developer / Xcode, then run:

  npm run ios:signing -- YOURTEAMID

Example only:
  npm run ios:signing -- ABC123DEFG

The Team ID is stored only in ios-config/Signing.local.xcconfig, which is gitignored.
EOF
  exit 2
fi

if [[ ! "$TEAM_ID" =~ ^[A-Za-z0-9]{10}$ ]]; then
  fail "Apple Team ID should be exactly 10 letters/numbers; got: $TEAM_ID"
fi

mkdir -p ios-config
cat > "$LOCAL_CONFIG" <<EOF
// Local Apple signing settings. DO NOT COMMIT.
DEVELOPMENT_TEAM = $TEAM_ID
EOF

say "Saved local Apple signing configuration"
printf 'Team ID: %s\n' "$TEAM_ID"
printf 'File: %s\n' "$LOCAL_CONFIG"
printf 'Next: npm run ios:archive\n'
