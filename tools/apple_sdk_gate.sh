#!/usr/bin/env bash
set -euo pipefail

fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

command -v xcodebuild >/dev/null 2>&1 || fail "xcodebuild is required for App Store releases."
command -v xcrun >/dev/null 2>&1 || fail "xcrun is required for App Store releases."

XCODE_VERSION="$(xcodebuild -version | awk '/^Xcode / {print $2; exit}')"
SDK_VERSION="$(xcrun --sdk iphoneos --show-sdk-version)"
XCODE_MAJOR="${XCODE_VERSION%%.*}"
SDK_MAJOR="${SDK_VERSION%%.*}"

[[ "$XCODE_MAJOR" =~ ^[0-9]+$ ]] || fail "Could not determine Xcode version."
[[ "$SDK_MAJOR" =~ ^[0-9]+$ ]] || fail "Could not determine iOS SDK version."
[[ "$XCODE_MAJOR" -ge 26 ]] || fail "App Store uploads now require Xcode 26 or later; found Xcode $XCODE_VERSION."
[[ "$SDK_MAJOR" -ge 26 ]] || fail "App Store uploads now require the iOS 26 SDK or later; found iOS SDK $SDK_VERSION."

printf 'App Store SDK floor: OK (Xcode %s, iOS SDK %s)\n' "$XCODE_VERSION" "$SDK_VERSION"
