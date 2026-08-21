#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-apply}"
SOURCE="ios-config/AppIcon-source.png"
SET_DIR="ios/App/App/Assets.xcassets/AppIcon.appiconset"
CONTENTS="$SET_DIR/Contents.json"

fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
say() { printf '\n==> %s\n' "$*"; }

[[ -f "$SOURCE" ]] || fail "Missing app icon source: $SOURCE"
command -v sips >/dev/null 2>&1 || fail "macOS sips is required to prepare app icons."

source_width="$(sips -g pixelWidth "$SOURCE" 2>/dev/null | awk '/pixelWidth:/ {print $2}')"
source_height="$(sips -g pixelHeight "$SOURCE" 2>/dev/null | awk '/pixelHeight:/ {print $2}')"
source_alpha="$(sips -g hasAlpha "$SOURCE" 2>/dev/null | awk '/hasAlpha:/ {print $2}')"
[[ -n "$source_width" && "$source_width" == "$source_height" ]] || fail "$SOURCE must be square."
[[ "$source_alpha" != "yes" ]] || fail "$SOURCE must be opaque (no alpha channel)."

required_files=(
  AppIcon-20.png AppIcon-20@2x.png AppIcon-20@3x.png
  AppIcon-29.png AppIcon-29@2x.png AppIcon-29@3x.png
  AppIcon-40.png AppIcon-40@2x.png AppIcon-40@3x.png
  AppIcon-60@2x.png AppIcon-60@3x.png
  AppIcon-76.png AppIcon-76@2x.png AppIcon-83.5@2x.png
  AppIcon-1024.png
)

if [[ "$MODE" == "--check" ]]; then
  [[ -f "$CONTENTS" ]] || fail "Missing $CONTENTS"
  for f in "${required_files[@]}"; do
    [[ -f "$SET_DIR/$f" ]] || fail "Missing generated app icon: $SET_DIR/$f"
  done
  grep -q '"idiom" : "ios-marketing"' "$CONTENTS" || fail "AppIcon Contents.json is missing the App Store marketing icon."
  grep -q '"filename" : "AppIcon-1024.png"' "$CONTENTS" || fail "AppIcon Contents.json is not wired to AppIcon-1024.png."
  printf 'AppIcon asset catalog: OK (complete iPhone/iPad/App Store set)\n'
  exit 0
fi

say "Generating complete iOS AppIcon asset catalog"
mkdir -p "$SET_DIR"
rm -f "$SET_DIR"/AppIcon-*.png

make_icon() {
  local pixels="$1"
  local filename="$2"
  sips -z "$pixels" "$pixels" "$SOURCE" --out "$SET_DIR/$filename" >/dev/null
}

make_icon 20 AppIcon-20.png
make_icon 40 AppIcon-20@2x.png
make_icon 60 AppIcon-20@3x.png
make_icon 29 AppIcon-29.png
make_icon 58 AppIcon-29@2x.png
make_icon 87 AppIcon-29@3x.png
make_icon 40 AppIcon-40.png
make_icon 80 AppIcon-40@2x.png
make_icon 120 AppIcon-40@3x.png
make_icon 120 AppIcon-60@2x.png
make_icon 180 AppIcon-60@3x.png
make_icon 76 AppIcon-76.png
make_icon 152 AppIcon-76@2x.png
make_icon 167 AppIcon-83.5@2x.png
make_icon 1024 AppIcon-1024.png

cat > "$CONTENTS" <<'JSON'
{
  "images" : [
    { "filename" : "AppIcon-20@2x.png", "idiom" : "iphone", "scale" : "2x", "size" : "20x20" },
    { "filename" : "AppIcon-20@3x.png", "idiom" : "iphone", "scale" : "3x", "size" : "20x20" },
    { "filename" : "AppIcon-29@2x.png", "idiom" : "iphone", "scale" : "2x", "size" : "29x29" },
    { "filename" : "AppIcon-29@3x.png", "idiom" : "iphone", "scale" : "3x", "size" : "29x29" },
    { "filename" : "AppIcon-40@2x.png", "idiom" : "iphone", "scale" : "2x", "size" : "40x40" },
    { "filename" : "AppIcon-40@3x.png", "idiom" : "iphone", "scale" : "3x", "size" : "40x40" },
    { "filename" : "AppIcon-60@2x.png", "idiom" : "iphone", "scale" : "2x", "size" : "60x60" },
    { "filename" : "AppIcon-60@3x.png", "idiom" : "iphone", "scale" : "3x", "size" : "60x60" },

    { "filename" : "AppIcon-20.png", "idiom" : "ipad", "scale" : "1x", "size" : "20x20" },
    { "filename" : "AppIcon-20@2x.png", "idiom" : "ipad", "scale" : "2x", "size" : "20x20" },
    { "filename" : "AppIcon-29.png", "idiom" : "ipad", "scale" : "1x", "size" : "29x29" },
    { "filename" : "AppIcon-29@2x.png", "idiom" : "ipad", "scale" : "2x", "size" : "29x29" },
    { "filename" : "AppIcon-40.png", "idiom" : "ipad", "scale" : "1x", "size" : "40x40" },
    { "filename" : "AppIcon-40@2x.png", "idiom" : "ipad", "scale" : "2x", "size" : "40x40" },
    { "filename" : "AppIcon-76.png", "idiom" : "ipad", "scale" : "1x", "size" : "76x76" },
    { "filename" : "AppIcon-76@2x.png", "idiom" : "ipad", "scale" : "2x", "size" : "76x76" },
    { "filename" : "AppIcon-83.5@2x.png", "idiom" : "ipad", "scale" : "2x", "size" : "83.5x83.5" },

    { "filename" : "AppIcon-1024.png", "idiom" : "ios-marketing", "scale" : "1x", "size" : "1024x1024" }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
JSON

bash "$0" --check
