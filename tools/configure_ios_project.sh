#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-apply}"
PLIST="ios/App/App/Info.plist"
WORKSPACE="ios/App/App.xcworkspace"
SCHEME="App"
XCCONFIG="ios-config/AppStore.xcconfig"
BUNDLE_ID="com.flesentine.msmadrigal"

fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
say() { printf '\n==> %s\n' "$*"; }

[[ -f "$PLIST" ]] || fail "Missing $PLIST. Run npm run ios:setup first."
[[ -f "$WORKSPACE/contents.xcworkspacedata" ]] || fail "Missing $WORKSPACE."
[[ -f "$XCCONFIG" ]] || fail "Missing $XCCONFIG."
command -v python3 >/dev/null 2>&1 || fail "python3 is required."
command -v xcodebuild >/dev/null 2>&1 || fail "xcodebuild is required."

if [[ "$MODE" != "--check" ]]; then
  say "Applying version-controlled iOS release settings"
  python3 - "$PLIST" <<'PY'
import plistlib
import sys
from pathlib import Path

path = Path(sys.argv[1])
with path.open('rb') as f:
    data = plistlib.load(f)

data['CFBundleDisplayName'] = 'Ms. Madrigral'
data['UISupportedInterfaceOrientations'] = [
    'UIInterfaceOrientationPortrait',
    'UIInterfaceOrientationLandscapeLeft',
    'UIInterfaceOrientationLandscapeRight',
]
data['UISupportedInterfaceOrientations~ipad'] = [
    'UIInterfaceOrientationPortrait',
    'UIInterfaceOrientationPortraitUpsideDown',
    'UIInterfaceOrientationLandscapeLeft',
    'UIInterfaceOrientationLandscapeRight',
]

with path.open('wb') as f:
    plistlib.dump(data, f, sort_keys=False)
PY
fi

say "Verifying iOS release settings"
python3 - "$PLIST" <<'PY'
import plistlib
import sys
from pathlib import Path

path = Path(sys.argv[1])
with path.open('rb') as f:
    data = plistlib.load(f)

expected_phone = [
    'UIInterfaceOrientationPortrait',
    'UIInterfaceOrientationLandscapeLeft',
    'UIInterfaceOrientationLandscapeRight',
]
expected_ipad = [
    'UIInterfaceOrientationPortrait',
    'UIInterfaceOrientationPortraitUpsideDown',
    'UIInterfaceOrientationLandscapeLeft',
    'UIInterfaceOrientationLandscapeRight',
]

if data.get('CFBundleDisplayName') != 'Ms. Madrigral':
    raise SystemExit('CFBundleDisplayName is not Ms. Madrigral')
if data.get('UISupportedInterfaceOrientations') != expected_phone:
    raise SystemExit('iPhone orientations do not match release configuration')
if data.get('UISupportedInterfaceOrientations~ipad') != expected_ipad:
    raise SystemExit('iPad orientations do not match release configuration')
PY

SETTINGS="$(xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -showBuildSettings \
  -xcconfig "$XCCONFIG")"

grep -q "PRODUCT_BUNDLE_IDENTIFIER = $BUNDLE_ID" <<<"$SETTINGS" || fail "Release bundle identifier is not $BUNDLE_ID."
grep -q 'MARKETING_VERSION = 1.0' <<<"$SETTINGS" || fail "Release marketing version is not 1.0."
grep -q 'CURRENT_PROJECT_VERSION = 1' <<<"$SETTINGS" || fail "Release build number is not 1."
grep -q 'TARGETED_DEVICE_FAMILY = 1,2' <<<"$SETTINGS" || fail "Release device family is not iPhone + iPad."
grep -q 'CODE_SIGN_STYLE = Automatic' <<<"$SETTINGS" || fail "Automatic signing is not enabled for the release configuration."

printf 'App Store project settings: OK (bundle %s, version 1.0, build 1, iPhone+iPad)\n' "$BUNDLE_ID"
