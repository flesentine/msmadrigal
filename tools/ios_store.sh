#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BUNDLE_ID="com.flesentine.msmadrigal"
WORKSPACE="ios/App/App.xcworkspace"
PROJECT="ios/App/App.xcodeproj"
SCHEME="App"
ARCHIVE_PATH="build/MsMadrigral.xcarchive"
XCCONFIG="ios-config/AppStore.xcconfig"
SIGNING_CONFIG="ios-config/Signing.local.xcconfig"
PRIVACY_SOURCE="ios-config/PrivacyInfo.xcprivacy"
PRIVACY_NATIVE="ios/App/App/PrivacyInfo.xcprivacy"
ICON_SOURCE="ios-config/AppIcon-source.png"
ICON_NATIVE="ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"

say() { printf '\n==> %s\n' "$*"; }
warn() { printf '\nWARNING: %s\n' "$*" >&2; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

resolve_xcode_container() {
  XCODE_ARGS=()
  if [[ -f "$WORKSPACE/contents.xcworkspacedata" ]]; then
    XCODE_ARGS=(-workspace "$WORKSPACE")
  elif [[ -d "$PROJECT" ]]; then
    XCODE_ARGS=(-project "$PROJECT")
  else
    fail "Missing Xcode container. Expected $WORKSPACE or $PROJECT."
  fi
}

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
      fail "App icon artwork missing at $ICON_SOURCE."
    fi
    warn "App icon artwork is not checked in yet at $ICON_SOURCE."
    return 0
  fi

  command -v sips >/dev/null 2>&1 || fail "macOS sips tool is required to prepare the App Store icon."

  local source_width source_height source_alpha
  source_width="$(sips -g pixelWidth "$ICON_SOURCE" 2>/dev/null | awk '/pixelWidth:/ {print $2}')"
  source_height="$(sips -g pixelHeight "$ICON_SOURCE" 2>/dev/null | awk '/pixelHeight:/ {print $2}')"
  source_alpha="$(sips -g hasAlpha "$ICON_SOURCE" 2>/dev/null | awk '/hasAlpha:/ {print $2}')"
  [[ -n "$source_width" && "$source_width" == "$source_height" ]] || fail "$ICON_SOURCE must be a square PNG."
  [[ "$source_alpha" != "yes" ]] || fail "$ICON_SOURCE must not contain transparency."

  if [[ -d ios/App ]]; then
    mkdir -p "$(dirname "$ICON_NATIVE")"
    sips -z 1024 1024 "$ICON_SOURCE" --out "$ICON_NATIVE" >/dev/null

    local width height alpha
    width="$(sips -g pixelWidth "$ICON_NATIVE" 2>/dev/null | awk '/pixelWidth:/ {print $2}')"
    height="$(sips -g pixelHeight "$ICON_NATIVE" 2>/dev/null | awk '/pixelHeight:/ {print $2}')"
    alpha="$(sips -g hasAlpha "$ICON_NATIVE" 2>/dev/null | awk '/hasAlpha:/ {print $2}')"
    [[ "$width" == "1024" && "$height" == "1024" ]] || fail "Generated App Store icon must be exactly 1024x1024 pixels."
    [[ "$alpha" != "yes" ]] || fail "Generated App Store icon must not contain transparency."
  fi

  printf 'App Store icon: OK (source %sx%s, generated 1024x1024 opaque asset)\n' "$source_width" "$source_height"
}

check_signing_ready() {
  resolve_xcode_container

  local settings team
  settings="$(xcodebuild \
    "${XCODE_ARGS[@]}" \
    -scheme "$SCHEME" \
    -configuration Release \
    -showBuildSettings \
    -xcconfig "$XCCONFIG")"
  team="$(awk -F' = ' '/^[[:space:]]*DEVELOPMENT_TEAM = /{print $2; exit}' <<<"$settings")"

  if [[ -z "$team" ]]; then
    fail "Apple Development Team is not configured. Run: npm run ios:signing -- YOURTEAMID"
  fi

  [[ "$team" =~ ^[A-Za-z0-9]{10}$ ]] || fail "Resolved DEVELOPMENT_TEAM is invalid: $team"
  printf 'Apple signing team: %s\n' "$team"

  if [[ ! -f "$SIGNING_CONFIG" ]]; then
    warn "Using the team stored in the generated Xcode project. For a reproducible bash-only setup, run: npm run ios:signing -- $team"
  fi
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
  bash tools/npm_security.sh
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
  bash tools/npm_security.sh
  check_privacy_manifest
  check_store_icon false
  if [[ -d ios/App ]]; then
    bash tools/configure_ios_project.sh --check
  fi
}

archive_release() {
  prepare_release
  check_store_icon true
  check_signing_ready
  mkdir -p build
  say "Archiving signed App Store release"
  xcodebuild \
    "${XCODE_ARGS[@]}" \
    -scheme "$SCHEME" \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath "$ARCHIVE_PATH" \
    -xcconfig "$XCCONFIG" \
    -allowProvisioningUpdates \
    clean archive
  verify_archive
  say "Archive complete"
  printf '%s\n' "$ARCHIVE_PATH"
  printf 'Open Xcode Organizer to validate and upload to TestFlight.\n'
}

case "${1:-help}" in
  bootstrap)
    bash tools/ios.sh bootstrap
    bash tools/npm_security.sh
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
