#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-apply}"
SOURCE="ios-config/AppIcon-source.png"
SET_DIR="ios/App/App/Assets.xcassets/AppIcon.appiconset"
CONTENTS="$SET_DIR/Contents.json"
SCALER="tools/scale_png_rgb.py"

fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
say() { printf '\n==> %s\n' "$*"; }

[[ -f "$SOURCE" ]] || fail "Missing app icon source: $SOURCE"
[[ -f "$SCALER" ]] || fail "Missing deterministic PNG scaler: $SCALER"
command -v python3 >/dev/null 2>&1 || fail "python3 is required to prepare app icons."

# Validate the real artwork before generating anything. This intentionally
# rejects blank/near-black output so a broken conversion can never make it into
# another TestFlight build unnoticed.
python3 "$SCALER" --validate "$SOURCE" >/dev/null

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
  python3 "$SCALER" --validate "$SET_DIR/AppIcon-60@3x.png" >/dev/null
  python3 "$SCALER" --validate "$SET_DIR/AppIcon-1024.png" >/dev/null
  printf 'AppIcon asset catalog: OK (color artwork verified; complete iPhone/iPad/App Store set)\n'
  exit 0
fi

say "Generating complete iOS AppIcon asset catalog"
mkdir -p "$SET_DIR"
rm -f "$SET_DIR"/AppIcon-*.png

# Use our stdlib-only RGB PNG scaler instead of `sips`. On this project sips
# produced a valid-looking but effectively black icon rendition. This scaler
# preserves the source RGB pixels exactly (nearest-neighbor for the 8-bit art)
# and always writes opaque 8-bit RGB PNGs.
make_icon() {
  local pixels="$1"
  local filename="$2"
  python3 "$SCALER" "$SOURCE" "$SET_DIR/$filename" "$pixels" >/dev/null
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
