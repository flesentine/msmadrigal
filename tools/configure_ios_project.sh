#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-apply}"
PLIST="ios/App/App/Info.plist"
PBXPROJ="ios/App/App.xcodeproj/project.pbxproj"
WORKSPACE="ios/App/App.xcworkspace"
PROJECT="ios/App/App.xcodeproj"
SCHEME="App"
XCCONFIG="ios-config/AppStore.xcconfig"
BUNDLE_ID="com.flesentine.msmadrigal"
PRIVACY_PHASE_ID="A11CEB00A11CEB00A11CEB00"

fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
say() { printf '\n==> %s\n' "$*"; }

xcode_container_args() {
  if [[ -f "$WORKSPACE/contents.xcworkspacedata" ]]; then
    printf '%s\0%s\0' '-workspace' "$WORKSPACE"
  elif [[ -d "$PROJECT" ]]; then
    printf '%s\0%s\0' '-project' "$PROJECT"
  else
    fail "Missing Xcode container. Expected $WORKSPACE or $PROJECT."
  fi
}

[[ -f "$PLIST" ]] || fail "Missing $PLIST. Run npm run ios:setup first."
[[ -f "$PBXPROJ" ]] || fail "Missing $PBXPROJ. Run npm run ios:setup first."
[[ -f "$XCCONFIG" ]] || fail "Missing $XCCONFIG."
command -v python3 >/dev/null 2>&1 || fail "python3 is required."
command -v xcodebuild >/dev/null 2>&1 || fail "xcodebuild is required."

EXPECTED_BUILD="$(awk -F= '/^[[:space:]]*CURRENT_PROJECT_VERSION[[:space:]]*=/{gsub(/[[:space:]]/, "", $2); print $2; exit}' "$XCCONFIG")"
[[ "$EXPECTED_BUILD" =~ ^[0-9]+$ ]] || fail "Could not read a numeric CURRENT_PROJECT_VERSION from $XCCONFIG"

XCODE_ARGS=()
while IFS= read -r -d '' arg; do XCODE_ARGS+=("$arg"); done < <(xcode_container_args)

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
data['ITSAppUsesNonExemptEncryption'] = False
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

  say "Ensuring PrivacyInfo.xcprivacy is copied into the signed app bundle"
  python3 - "$PBXPROJ" "$PRIVACY_PHASE_ID" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
phase_id = sys.argv[2]
text = path.read_text(encoding='utf-8')
phase_name = 'Copy Privacy Manifest'

if f'{phase_id} /* {phase_name} */' not in text:
    target_re = re.compile(
        r'(?P<prefix>[A-F0-9]{24} /\* App \*/ = \{\n\s*isa = PBXNativeTarget;)(?P<body>.*?)(?P<suffix>\n\s*\};)',
        re.S,
    )
    match = target_re.search(text)
    if not match:
        raise SystemExit('Could not locate the App PBXNativeTarget in project.pbxproj')

    body = match.group('body')
    build_phases_re = re.compile(r'(buildPhases = \(\n)(?P<items>.*?)(\n\s*\);)', re.S)
    phases = build_phases_re.search(body)
    if not phases:
        raise SystemExit('Could not locate App buildPhases in project.pbxproj')

    new_body = (
        body[:phases.start()]
        + phases.group(1)
        + f'\t\t\t\t{phase_id} /* {phase_name} */,\n'
        + phases.group('items')
        + phases.group(3)
        + body[phases.end():]
    )
    text = text[:match.start('body')] + new_body + text[match.end('body'):]

if f'{phase_id} /* {phase_name} */ = {{' not in text:
    phase = f'''\t\t{phase_id} /* {phase_name} */ = {{
\t\t\tisa = PBXShellScriptBuildPhase;
\t\t\talwaysOutOfDate = 1;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\tinputFileListPaths = (
\t\t\t);
\t\t\tinputPaths = (
\t\t\t\t"$(PROJECT_DIR)/../../ios-config/PrivacyInfo.xcprivacy",
\t\t\t);
\t\t\tname = "{phase_name}";
\t\t\toutputFileListPaths = (
\t\t\t);
\t\t\toutputPaths = (
\t\t\t\t"$(TARGET_BUILD_DIR)/$(UNLOCALIZED_RESOURCES_FOLDER_PATH)/PrivacyInfo.xcprivacy",
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t\tshellPath = /bin/sh;
\t\t\tshellScript = "set -e\\nsrc=\\\"${{PROJECT_DIR}}/../../ios-config/PrivacyInfo.xcprivacy\\\"\\ndst=\\\"${{TARGET_BUILD_DIR}}/${{UNLOCALIZED_RESOURCES_FOLDER_PATH}}/PrivacyInfo.xcprivacy\\\"\\ncp \\\"$src\\\" \\\"$dst\\\"\\n";
\t\t}};
'''

    shell_end = '/* End PBXShellScriptBuildPhase section */'
    sources_begin = '/* Begin PBXSourcesBuildPhase section */'
    if shell_end in text:
        text = text.replace(shell_end, phase + shell_end, 1)
    elif sources_begin in text:
        section = f'''/* Begin PBXShellScriptBuildPhase section */\n{phase}/* End PBXShellScriptBuildPhase section */\n\n'''
        text = text.replace(sources_begin, section + sources_begin, 1)
    else:
        raise SystemExit('Could not locate insertion point for PBXShellScriptBuildPhase')

path.write_text(text, encoding='utf-8')
PY

  bash tools/prepare_app_icon.sh
else
  bash tools/prepare_app_icon.sh --check
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
if data.get('ITSAppUsesNonExemptEncryption') is not False:
    raise SystemExit('ITSAppUsesNonExemptEncryption must be false for this offline build')
if data.get('UISupportedInterfaceOrientations') != expected_phone:
    raise SystemExit('iPhone orientations do not match release configuration')
if data.get('UISupportedInterfaceOrientations~ipad') != expected_ipad:
    raise SystemExit('iPad orientations do not match release configuration')
PY

grep -q "$PRIVACY_PHASE_ID /\* Copy Privacy Manifest \*/" "$PBXPROJ" || fail "Xcode project is missing the Privacy Manifest copy build phase."
grep -q 'UNLOCALIZED_RESOURCES_FOLDER_PATH)/PrivacyInfo.xcprivacy' "$PBXPROJ" || fail "Privacy Manifest build phase is missing its app-bundle output path."

SETTINGS="$(xcodebuild \
  "${XCODE_ARGS[@]}" \
  -scheme "$SCHEME" \
  -configuration Release \
  -showBuildSettings \
  -xcconfig "$XCCONFIG")"

grep -q "PRODUCT_BUNDLE_IDENTIFIER = $BUNDLE_ID" <<<"$SETTINGS" || fail "Release bundle identifier is not $BUNDLE_ID."
grep -q 'MARKETING_VERSION = 1.0' <<<"$SETTINGS" || fail "Release marketing version is not 1.0."
grep -q "CURRENT_PROJECT_VERSION = $EXPECTED_BUILD" <<<"$SETTINGS" || fail "Release build number is not $EXPECTED_BUILD."
grep -q 'TARGETED_DEVICE_FAMILY = 1,2' <<<"$SETTINGS" || fail "Release device family is not iPhone + iPad."
grep -q 'CODE_SIGN_STYLE = Automatic' <<<"$SETTINGS" || fail "Automatic signing is not enabled for the release configuration."
grep -q 'ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon' <<<"$SETTINGS" || fail "Release app icon catalog is not AppIcon."

printf 'App Store project settings: OK (bundle %s, version 1.0, build %s, iPhone+iPad, AppIcon wired, privacy manifest copy phase, export compliance declared)\n' "$BUNDLE_ID" "$EXPECTED_BUILD"
