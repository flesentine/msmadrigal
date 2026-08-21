#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ARCHIVE_PATH="build/MsMadrigral.xcarchive"
EXPORT_OPTIONS="build/TestFlightExportOptions.plist"
EXPORT_PATH="build/TestFlightUpload"

say() { printf '\n==> %s\n' "$*"; }
warn() { printf '\nWARNING: %s\n' "$*" >&2; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || fail "TestFlight upload must run on macOS."
command -v xcodebuild >/dev/null 2>&1 || fail "xcodebuild is unavailable. Install/open Xcode first."

say "Creating signed App Store archive"
bash tools/ios_store.sh archive
[[ -d "$ARCHIVE_PATH" ]] || fail "Archive not found at $ARCHIVE_PATH"

mkdir -p build
rm -rf "$EXPORT_PATH"
cat > "$EXPORT_OPTIONS" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>destination</key>
  <string>upload</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>uploadSymbols</key>
  <true/>
  <key>manageAppVersionAndBuildNumber</key>
  <false/>
</dict>
</plist>
PLIST

say "Uploading build 1.0 (2) to App Store Connect / TestFlight"
if xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -allowProvisioningUpdates; then
  say "Upload accepted by App Store Connect"
  printf 'Apple will process the build before it appears in TestFlight.\n'
  printf 'Open: https://appstoreconnect.apple.com/\n'
  open 'https://appstoreconnect.apple.com/' >/dev/null 2>&1 || true
  exit 0
fi

warn "Command-line upload failed. The signed archive is still valid; opening it in Xcode Organizer for the upload fallback."
open "$ARCHIVE_PATH" >/dev/null 2>&1 || true
cat <<'EOF'

In Xcode Organizer:
  1. Select the MsMadrigral archive.
  2. Click Distribute App.
  3. Choose TestFlight & App Store.
  4. Use automatic signing and Upload.

If Xcode reports that the app does not exist in App Store Connect, create the app record first and rerun:
  npm run ios:testflight
EOF
exit 1
