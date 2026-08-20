#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP_NAME="Ms. Madrigral"
WORKSPACE="ios/App/App.xcworkspace"
SCHEME="App"
ARCHIVE_PATH="build/MsMadrigral.xcarchive"

say() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

need_macos() {
  [[ "$(uname -s)" == "Darwin" ]] || fail "iOS builds require macOS."
}

need_xcode() {
  xcode-select -p >/dev/null 2>&1 || fail "Xcode is not installed/configured. Install Xcode, launch it once, then run this again."
  command -v xcodebuild >/dev/null 2>&1 || fail "xcodebuild is unavailable."
}

ensure_homebrew() {
  command -v brew >/dev/null 2>&1 || fail "Homebrew is required for automated dependency setup. Install it from brew.sh, then rerun."
}

bootstrap() {
  need_macos
  need_xcode
  ensure_homebrew

  say "Installing required command-line dependencies"
  brew list node >/dev/null 2>&1 || brew install node
  brew list espeak-ng >/dev/null 2>&1 || brew install espeak-ng

  say "Installing npm dependencies"
  npm install

  prepare

  say "Bootstrap complete"
  printf 'Next: npm run ios:open\n'
}

prepare() {
  need_macos
  need_xcode
  command -v node >/dev/null 2>&1 || fail "Node.js is missing. Run: bash tools/ios.sh bootstrap"
  command -v espeak-ng >/dev/null 2>&1 || fail "espeak-ng is missing. Run: bash tools/ios.sh bootstrap"

  [[ -d node_modules ]] || npm install

  say "Building bundled offline web app + 500 pronunciation samples"
  npm run build:ios-web

  if [[ ! -d ios/App ]]; then
    say "Creating Capacitor iOS project"
    npx cap add ios
  else
    say "Syncing web bundle into existing iOS project"
    npx cap sync ios
  fi

  mkdir -p ios/App/App
  cp ios-config/PrivacyInfo.xcprivacy ios/App/App/PrivacyInfo.xcprivacy

  say "iOS project prepared"
}

open_xcode() {
  prepare
  say "Opening Xcode"
  npx cap open ios
}

check() {
  need_macos
  need_xcode

  say "Checking required files"
  for f in package.json capacitor.config.ts vocab.csv privacy.html support.html ios-config/PrivacyInfo.xcprivacy; do
    [[ -f "$f" ]] || fail "Missing $f"
  done

  say "Checking toolchain"
  printf 'macOS: %s\n' "$(sw_vers -productVersion)"
  printf 'Xcode: %s\n' "$(xcodebuild -version | tr '\n' ' ')"
  printf 'Node: %s\n' "$(node --version 2>/dev/null || echo missing)"
  printf 'npm: %s\n' "$(npm --version 2>/dev/null || echo missing)"
  printf 'espeak-ng: %s\n' "$(espeak-ng --version 2>/dev/null | head -1 || echo missing)"

  if [[ -d ios/App ]]; then
    say "Checking Xcode project"
    xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" -showBuildSettings >/dev/null
    printf 'Xcode workspace: OK\n'
  else
    printf 'iOS native project: not generated yet (run npm run ios:setup)\n'
  fi

  say "Store readiness reminders"
  printf '%s\n' \
    '- Apple Developer team/signing must be selected in Xcode.' \
    '- Final 1024x1024 app icon is still required.' \
    '- Verify PrivacyInfo.xcprivacy is included in the App target Resources.' \
    '- Run on a real iPhone and TestFlight before submission.'
}

archive() {
  prepare
  [[ -f "$WORKSPACE/contents.xcworkspacedata" ]] || fail "Workspace not found at $WORKSPACE"

  mkdir -p build
  say "Archiving release build"
  xcodebuild \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath "$ARCHIVE_PATH" \
    clean archive

  say "Archive complete"
  printf '%s\n' "$ARCHIVE_PATH"
  printf 'Open Xcode Organizer to validate and upload to TestFlight.\n'
}

clean() {
  say "Removing generated local iOS build artifacts"
  rm -rf www build
  printf 'Kept ios/ native project.\n'
}

usage() {
  cat <<'EOF'
Ms. Madrigral iOS automation

Usage:
  bash tools/ios.sh bootstrap   Install dependencies + create/sync iOS project
  bash tools/ios.sh prepare     Rebuild offline bundle + sync Capacitor
  bash tools/ios.sh open        Prepare + open Xcode
  bash tools/ios.sh check       Verify toolchain and release prerequisites
  bash tools/ios.sh archive     Prepare + create signed Release archive
  bash tools/ios.sh clean       Remove generated www/ and build/ output

What still requires Apple/Xcode setup:
  - Apple Developer account/team selection
  - signing certificates/profiles
  - final app icon
  - App Store Connect record/screenshots
  - final TestFlight/App Review submission
EOF
}

case "${1:-help}" in
  bootstrap) bootstrap ;;
  prepare) prepare ;;
  open) open_xcode ;;
  check) check ;;
  archive) archive ;;
  clean) clean ;;
  help|-h|--help) usage ;;
  *) usage; exit 2 ;;
esac
