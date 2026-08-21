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

IDENTITIES="$(security find-identity -v -p codesigning 2>/dev/null || true)"
DISTRIBUTION_TEAMS="$(printf '%s\n' "$IDENTITIES" \
  | sed -nE 's/.*"Apple Distribution:.*\(([A-Za-z0-9]{10})\)".*/\1/p' \
  | sort -u)"
DISTRIBUTION_COUNT="$(printf '%s\n' "$DISTRIBUTION_TEAMS" | awk 'NF {n++} END {print n+0}')"

if [[ -z "$TEAM_ID" && -f "$LOCAL_CONFIG" ]]; then
  CURRENT="$(awk -F= '/^[[:space:]]*DEVELOPMENT_TEAM[[:space:]]*=/{gsub(/[[:space:]]/, "", $2); print $2; exit}' "$LOCAL_CONFIG")"
  if [[ -n "$CURRENT" ]]; then
    if printf '%s\n' "$DISTRIBUTION_TEAMS" | grep -qx "$CURRENT"; then
      printf 'Apple Distribution Team: %s\n' "$CURRENT"
      printf 'Local signing config: %s\n' "$LOCAL_CONFIG"
      exit 0
    fi

    if [[ "$DISTRIBUTION_COUNT" -eq 1 ]]; then
      TEAM_ID="$(printf '%s\n' "$DISTRIBUTION_TEAMS" | awk 'NF {print; exit}')"
      say "Replacing stale local team with Apple Distribution team"
      printf 'Previous Team ID: %s\n' "$CURRENT"
      printf 'Distribution Team ID: %s\n' "$TEAM_ID"
    else
      printf 'Apple signing team: %s\n' "$CURRENT"
      printf 'Local signing config: %s\n' "$LOCAL_CONFIG"
      exit 0
    fi
  fi
fi

if [[ -z "$TEAM_ID" && "$DISTRIBUTION_COUNT" -eq 1 ]]; then
  TEAM_ID="$(printf '%s\n' "$DISTRIBUTION_TEAMS" | awk 'NF {print; exit}')"
  say "Detected Apple Distribution team from Keychain"
  printf 'Team ID: %s\n' "$TEAM_ID"
fi

if [[ -z "$TEAM_ID" ]]; then
  TEAMS="$(printf '%s\n' "$IDENTITIES" \
    | sed -nE 's/.*"Apple (Development|Distribution):.*\(([A-Za-z0-9]{10})\)".*/\2/p' \
    | sort -u)"
  TEAM_COUNT="$(printf '%s\n' "$TEAMS" | awk 'NF {n++} END {print n+0}')"

  if [[ "$TEAM_COUNT" -eq 1 ]]; then
    TEAM_ID="$(printf '%s\n' "$TEAMS" | awk 'NF {print; exit}')"
    say "Detected Apple signing team from Keychain"
    printf 'Team ID: %s\n' "$TEAM_ID"
  elif [[ "$TEAM_COUNT" -gt 1 ]]; then
    say "Multiple Apple signing teams detected"
    printf '%s\n' "$TEAMS" | sed 's/^/  /'
    cat <<'EOF'

Choose the correct App Store Connect team explicitly:

  npm run ios:signing -- YOURTEAMID
EOF
    exit 2
  else
    say "Installed code-signing identities"
    printf '%s\n' "$IDENTITIES"
    cat <<'EOF'

No Apple Development/Distribution Team ID could be detected.

Make sure your Apple Developer account is signed into Xcode and a signing
certificate exists, or pass the Team ID explicitly:

  npm run ios:signing -- YOURTEAMID

The Team ID is stored only in ios-config/Signing.local.xcconfig, which is gitignored.
EOF
    exit 2
  fi
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
