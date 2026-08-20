#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP_NAME="Ms. Madrigral"
BUNDLE_ID="com.flesentine.msmadrigal"
WORKSPACE="ios/App/App.xcworkspace"
SCHEME="App"
ARCHIVE_PATH="build/MsMadrigral.xcarchive"
PUBLIC_INDEX="ios/App/App/public/index.html"
PUBLIC_APP="ios/App/App/public/app.js"
PUBLIC_FOCUS="ios/App/App/public/ios-focus.js"

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

verify_native_bundle() {
  [[ -f www/index.html ]] || fail "www/index.html was not generated."
  [[ -f www/ios-focus.js ]] || fail "www/ios-focus.js was not generated."
  grep -q 'name="ios-native-build" content="78"' www/index.html || fail "Generated www bundle is not native build 78."
  grep -q 'style="display:none!important" aria-hidden="true">500 WORD VOCABULARY' www/index.html || fail "Native subtitle hide was not applied."
  grep -q 'class="controls" style="display:none!important"' www/index.html || fail "Native controls hide was not applied."
  grep -q 'transform: rotate(-28deg) !important;' www/index.html || fail "Native portrait pointer adjustment was not applied."
  grep -q 'z-index: 9 !important;' www/index.html || fail "Native portrait teacher layering was not applied."
  grep -q 'z-index: 10 !important;' www/index.html || fail "Native portrait pointer layering was not applied."
  grep -q 'grid-template-columns: minmax(0, 1fr) auto !important;' www/index.html || fail "Native landscape status layout was not applied."
  grep -q 'ios-focus.js?v=78' www/index.html || fail "Native focus walk-in script is not linked."
  grep -q 'replayWalkIn' www/ios-focus.js || fail "Native focus walk-in behavior was not packaged."
  grep -q 'TOUCH TO REVEAL SPANISH' www/app.js || fail "Mobile touch prompt was not packaged."
  grep -q 'Hola, soy Ms. Madrigral.' www/app.js || fail "Updated Ms. Madrigral intro fallback was not packaged."

  [[ -f "$PUBLIC_INDEX" ]] || fail "$PUBLIC_INDEX was not copied by Capacitor."
  [[ -f "$PUBLIC_APP" ]] || fail "$PUBLIC_APP was not copied by Capacitor."
  [[ -f "$PUBLIC_FOCUS" ]] || fail "$PUBLIC_FOCUS was not copied by Capacitor."
  grep -q 'name="ios-native-build" content="78"' "$PUBLIC_INDEX" || fail "Xcode public bundle is stale; expected native build 78."
  grep -q 'class="controls" style="display:none!important"' "$PUBLIC_INDEX" || fail "Xcode public bundle still has visible controls."
  grep -q 'transform: rotate(-28deg) !important;' "$PUBLIC_INDEX" || fail "Xcode public bundle is missing portrait pointer adjustment."
  grep -q 'z-index: 9 !important;' "$PUBLIC_INDEX" || fail "Xcode public bundle is missing portrait teacher layering."
  grep -q 'z-index: 10 !important;' "$PUBLIC_INDEX" || fail "Xcode public bundle is missing portrait pointer layering."
  grep -q 'grid-template-columns: minmax(0, 1fr) auto !important;' "$PUBLIC_INDEX" || fail "Xcode public bundle is missing landscape status layout."
  grep -q 'TOUCH TO REVEAL SPANISH' "$PUBLIC_APP" || fail "Xcode public bundle is missing mobile touch prompt."
  grep -q 'replayWalkIn' "$PUBLIC_FOCUS" || fail "Xcode public bundle is missing focus walk-in behavior."

  say "Native bundle verification: OK (build 78)"
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

  verify_native_bundle
  say "iOS project prepared"
}

refresh_simulator() {
  if command -v xcrun >/dev/null 2>&1 && xcrun simctl list devices booted 2>/dev/null | grep -q '(Booted)'; then
    say "Removing any stale simulator install"
    xcrun simctl uninstall booted "$BUNDLE_ID" >/dev/null 2>&1 || true
  fi
}

open_xcode() {
  prepare
  refresh_simulator
  say "Opening Xcode"
  npx cap open ios
}

check() {
  need_macos
  need_xcode

  say "Checking required files"
  for f in package.json capacitor.config.ts vocab.csv privacy.html support.html ios-config/PrivacyInfo.xcprivacy ios-focus.js; do
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
    verify_native_bundle || true
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
  bash tools/ios.sh open        Prepare, clear stale simulator app, open Xcode
  bash tools/ios.sh check       Verify toolchain and release prerequisites
  bash tools/ios.sh archive     Prepare + create signed Release archive
  bash tools/ios.sh clean       Remove generated www/ and build/ output
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
