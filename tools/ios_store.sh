#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BUNDLE_ID="com.flesentine.msmadrigal"
WORKSPACE="ios/App/App.xcworkspace"
SCHEME="App"
ARCHIVE_PATH="build/MsMadrigral.xcarchive"
XCCONFIG="ios-config/AppStore.xcconfig"

say() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

prepare_release() {
  bash tools/ios.sh prepare
  bash tools/configure_ios_project.sh
}

open_release() {
  prepare_release
  if command -v xcrun >/dev/null 2>&1 && xcrun simctl list devices booted 2>/dev/null | grep -q '(Booted)'; then
    say "Removing any stale simulator install"
    xcrun simctl uninstall booted "$BUNDLE_ID" >/dev/null 2>&1 || true
  fi
  say "Opening Xcode"
  npx cap open ios
}

check_release() {
  bash tools/ios.sh check
  if [[ -d ios/App ]]; then
    bash tools/configure_ios_project.sh --check
  fi
}

archive_release() {
  prepare_release
  [[ -f "$WORKSPACE/contents.xcworkspacedata" ]] || fail "Workspace not found at $WORKSPACE"
  mkdir -p build
  say "Archiving App Store release"
  xcodebuild \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath "$ARCHIVE_PATH" \
    -xcconfig "$XCCONFIG" \
    clean archive
  say "Archive complete"
  printf '%s\n' "$ARCHIVE_PATH"
  printf 'Open Xcode Organizer to validate and upload to TestFlight.\n'
}

case "${1:-help}" in
  bootstrap)
    bash tools/ios.sh bootstrap
    bash tools/configure_ios_project.sh
    ;;
  setup|prepare)
    prepare_release
    ;;
  open)
    open_release
    ;;
  check)
    check_release
    ;;
  archive)
    archive_release
    ;;
  clean)
    bash tools/ios.sh clean
    ;;
  *)
    cat <<'EOF'
Ms. Madrigral App Store workflow

Usage:
  bash tools/ios_store.sh bootstrap
  bash tools/ios_store.sh setup
  bash tools/ios_store.sh open
  bash tools/ios_store.sh check
  bash tools/ios_store.sh archive
  bash tools/ios_store.sh clean
EOF
    ;;
esac
