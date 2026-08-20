#!/usr/bin/env python3
"""Build the fully local web bundle used by the Capacitor iOS app."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "www"

FILES = [
    "index.html",
    "styles.css",
    "app.js",
    "petscii.css",
    "petscii.js",
    "vocab.csv",
    "privacy.html",
    "support.html",
]


def make_ios_bundle_self_contained() -> None:
    """Apply native-only changes directly to the generated iOS bundle.

    Keep the public website untouched. For iOS, hide the subtitle/controls with
    inline styles (so runtime detection cannot undo them) and add fixed safe
    gutters for modern iPhone landscape screens with Dynamic Island/notches.
    """
    styles_path = OUT / "styles.css"
    styles = styles_path.read_text(encoding="utf-8")

    root_pos = styles.find(":root")
    if root_pos > 0:
        styles = styles[root_pos:]

    styles = styles.replace(
        '--petscii: "C64 Pro Mono", "Courier New", Courier, monospace;',
        '--petscii: ui-monospace, Menlo, Monaco, "Courier New", Courier, monospace;',
    )
    styles_path.write_text(styles, encoding="utf-8")

    index_path = OUT / "index.html"
    index = index_path.read_text(encoding="utf-8")

    index = index.replace('<html lang="en">', '<html lang="en" class="ios-native">', 1)

    # Hard-hide these in the native bundle itself. They remain in the DOM so
    # app.js can keep its existing event listeners without null checks.
    index = index.replace(
        '<div class="subtitle">500 WORD VOCABULARY</div>',
        '<div class="subtitle" style="display:none!important" aria-hidden="true">500 WORD VOCABULARY</div>',
        1,
    )
    index = index.replace(
        '<div class="controls" aria-label="Game controls">',
        '<div class="controls" style="display:none!important" aria-hidden="true" aria-label="Game controls">',
        1,
    )

    native_head = '''  <meta name="format-detection" content="telephone=no">
  <meta name="color-scheme" content="dark">
  <meta name="ios-native-build" content="75">
  <style id="ios-native-packaged-layout">
    .subtitle, .controls { display: none !important; }

    .masthead {
      left: max(24px, env(safe-area-inset-left)) !important;
      right: max(24px, env(safe-area-inset-right)) !important;
    }

    .statusbar {
      left: max(28px, env(safe-area-inset-left)) !important;
      right: max(28px, env(safe-area-inset-right)) !important;
      bottom: max(14px, env(safe-area-inset-bottom)) !important;
    }

    @media (orientation: landscape) and (max-width: 1100px) and (max-height: 850px) {
      .masthead {
        top: 10px !important;
        left: 92px !important;
        right: 92px !important;
      }

      .scene {
        top: 8% !important;
        bottom: 5% !important;
        left: max(58px, env(safe-area-inset-left)) !important;
        right: max(58px, env(safe-area-inset-right)) !important;
      }

      .board {
        right: 0 !important;
        width: 59% !important;
      }

      .teacher { left: 0 !important; }

      .statusbar {
        left: max(64px, env(safe-area-inset-left)) !important;
        right: max(64px, env(safe-area-inset-right)) !important;
        bottom: max(12px, env(safe-area-inset-bottom)) !important;
      }
    }

    @media (max-width: 700px) and (orientation: portrait) {
      .masthead { top: calc(env(safe-area-inset-top) + 18px) !important; }

      /* In portrait the teacher sits below the board. Pivot the stick around
         the visible hand end so its tip lands inside the left-middle board
         instead of skimming the lower edge. */
      .teacher .pointer {
        left: 53% !important;
        top: 37% !important;
        width: 82% !important;
        transform-origin: 0 93% !important;
        transform: rotate(-28deg) !important;
      }
    }
  </style>
'''

    index = index.replace(
        '  <meta name="theme-color" content="#050505">\n',
        '  <meta name="theme-color" content="#050505">\n' + native_head,
        1,
    )

    # Bust native WKWebView caches after this packaging change.
    index = index.replace('styles.css?v=72', 'styles.css?v=75')
    index = index.replace('petscii.css?v=72', 'petscii.css?v=75')
    index = index.replace('app.js?v=72', 'app.js?v=75')
    index = index.replace('petscii.js?v=72', 'petscii.js?v=75')
    index_path.write_text(index, encoding="utf-8")


def main() -> int:
    espeak = shutil.which("espeak-ng")
    if not espeak:
        print("ERROR: espeak-ng is required to build the bundled C64 voice audio.", file=sys.stderr)
        print("On macOS: brew install espeak-ng", file=sys.stderr)
        return 2

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    for name in FILES:
        shutil.copy2(ROOT / name, OUT / name)

    assets = ROOT / "assets"
    if assets.exists():
        shutil.copytree(assets, OUT / "assets")

    make_ios_bundle_self_contained()

    subprocess.run(
        [
            sys.executable,
            str(ROOT / "tools" / "build_web_audio.py"),
            "--vocab",
            str(ROOT / "vocab.csv"),
            "--out",
            str(OUT / "audio"),
        ],
        check=True,
    )

    print(f"Built iOS web bundle: {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
