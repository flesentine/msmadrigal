#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BUNDLE_ID="com.flesentine.msmadrigal"
WORKSPACE="ios/App/App.xcworkspace"
SCHEME="App"
ARCHIVE_PATH="build/MsMadrigral.xcarchive"
XCCONFIG="ios-config/AppStore.xcconfig"
PRIVACY_SOURCE="ios-config/PrivacyInfo.xcprivacy"
PRIVACY_NATIVE="ios/App/App/PrivacyInfo.xcprivacy"
ICON_SOURCE="ios-config/AppIcon-1024.png"
ICON_NATIVE="ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"

say() { printf '\n==> %s\n' "$*"; }
warn() { printf '\nWARNING: %s\n' "$*" >&2; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

check_privacy_manifest() {
  [[ -f "$PRIVACY_SOURCE" ]] || fail "Missing $PRIVACY_SOURCE"
  python3 - "$PRIVACY_SOURCE" <<'PY'
import plistlib
import sys
from pathlib import Path

path = Path(sys.argv[1])
with path.open('rb') as f:
    data = plistlib.load(f)

expected = {
    'NSPrivacyTracking': False,
    'NSPrivacyTrackingDomains': [],
    'NSPrivacyCollectedDataTypes': [],
    'NSPrivacyAccessedAPITypes': [],
}
for key, value in expected.items():
    if data.get(key) != value:
        raise SystemExit(f'{path}: unexpected {key}: {data.get(key)!r}')
PY

  if [[ -d ios/App ]]; then
    [[ -f "$PRIVACY_NATIVE" ]] || fail "Native app is missing $PRIVACY_NATIVE"
    cmp -s "$PRIVACY_SOURCE" "$PRIVACY_NATIVE" || fail "Native privacy manifest does not match $PRIVACY_SOURCE"
  fi
  printf 'Privacy manifest: OK\n'
}

check_store_icon() {
  local require_icon="${1:-false}"
  if [[ ! -f "$ICON_SOURCE" ]]; then
    if [[ "$require_icon" == "true" ]]; then
      fail "Final App Store icon missing. Add a 1024x1024 PNG at $ICON_SOURCE before archiving."
    fi
    warn "Final App Store icon is not checked in yet. Add a 1024x1024 PNG at $ICON_SOURCE before archiving."
    return 0
  fi

  command -v sips >/dev/null 2>&1 || fail "macOS sips tool is required to validate the App Store icon."
  local width height alpha
  width="$(sips -g pixelWidth "$ICON_SOURCE" 2>/dev/null | awk '/pixelWidth:/ {print $2}')"
  height="$(sips -g pixelHeight "$ICON_SOURCE" 2>/dev/null | awk '/pixelHeight:/ {print $2}')"
  alpha="$(sips -g hasAlpha "$ICON_SOURCE" 2>/dev/null | awk '/hasAlpha:/ {print $2}')"
  [[ "$width" == "1024" && "$height" == "1024" ]] || fail "$ICON_SOURCE must be exactly 1024x1024 pixels."
  [[ "$alpha" != "yes" ]] || fail "$ICON_SOURCE must not contain transparency."

  if [[ -d ios/App ]]; then
    mkdir -p "$(dirname "$ICON_NATIVE")"
    cp "$ICON_SOURCE" "$ICON_NATIVE"
    cmp -s "$ICON_SOURCE" "$ICON_NATIVE" || fail "Failed to install App Store icon into the native asset catalog."
  fi
  printf 'App Store icon: OK (1024x1024, opaque)\n'
}

verify_archive() {
  [[ -d "$ARCHIVE_PATH" ]] || fail "Archive not found at $ARCHIVE_PATH"

  local app_path
  app_path="$(find "$ARCHIVE_PATH/Products/Applications" -maxdepth 1 -type d -name '*.app' -print -quit 2>/dev/null || true)"
  [[ -n "$app_path" ]] || fail "No .app product found inside $ARCHIVE_PATH"
  [[ -f "$app_path/Info.plist" ]] || fail "Archived app is missing Info.plist"
  [[ -f "$app_path/PrivacyInfo.xcprivacy" ]] || fail "Archived app is missing PrivacyInfo.xcprivacy at the app bundle root"

  python3 - "$app_path/Info.plist" "$app_path/PrivacyInfo.xcprivacy" <<'PY'
import plistlib
import sys
from pathlib import Path

info_path = Path(sys.argv[1])
privacy_path = Path(sys.argv[2])

with info_path.open('rb') as f:
    info = plistlib.load(f)

expected_info = {
    'CFBundleIdentifier': 'com.flesentine.msmadrigal',
    'CFBundleShortVersionString': '1.0',
    'CFBundleVersion': '1',
    'ITSAppUsesNonExemptEncryption': False,
}
for key, value in expected_info.items():
    if info.get(key) != value:
        raise SystemExit(f'Archived Info.plist has unexpected {key}: {info.get(key)!r}')

with privacy_path.open('rb') as f:
    privacy = plistlib.load(f)

expected_privacy = {
    'NSPrivacyTracking': False,
    'NSPrivacyTrackingDomains': [],
    'NSPrivacyCollectedDataTypes': [],
    'NSPrivacyAccessedAPITypes': [],
}
for key, value in expected_privacy.items():
    if privacy.get(key) != value:
        raise SystemExit(f'Archived PrivacyInfo.xcprivacy has unexpected {key}: {privacy.get(key)!r}')
PY

  printf 'Archived app compliance: OK (bundle/version/build/export/privacy manifest)\n'
}

prepare_release() {
  bash tools/ios.sh prepare
  bash tools/configure_ios_project.sh
  check_privacy_manifest
  check_store_icon false
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
  check_privacy_manifest
  check_store_icon false
  if [[ -d ios/App ]]; then
    bash tools/configure_ios_project.sh --check
  fi
}

archive_release() {
  prepare_release
  check_store_icon true
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
  verify_archive
  say "Archive complete"
  printf '%s\n' "$ARCHIVE_PATH"
  printf 'Open Xcode Organizer to validate and upload to TestFlight.\n'
}

case "${1:-help}" in
  bootstrap)
    bash tools/ios.sh bootstrap
    bash tools/configure_ios_project.sh
    check_privacy_manifest
    check_store_icon false
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
