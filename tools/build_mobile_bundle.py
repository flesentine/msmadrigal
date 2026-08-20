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
    """Apply native-only packaging changes to the generated iOS web bundle.

    The public website stays untouched. The generated www/ copy gets an
    unconditional native stylesheet, so the iOS layout does not depend on the
    Capacitor JS bridge or runtime class detection.
    """
    styles_path = OUT / "styles.css"
    styles = styles_path.read_text(encoding="utf-8")

    # Visible game copy is rendered from the embedded C64 character ROM, so the
    # optional remote web font is unnecessary in the native/offline bundle.
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

    # Mark the native bundle for any native-aware JS/CSS that wants it.
    index = index.replace(
        '<html lang="en">',
        '<html lang="en" class="ios-native">',
        1,
    )

    # This stylesheet lives ONLY in www/index.html. Therefore these rules are
    # unconditionally native and cannot be undone by runtime detection.
    native_head = '''  <meta name="format-detection" content="telephone=no">
  <meta name="color-scheme" content="dark">
  <style id="ios-native-packaged-layout">
    .subtitle,
    .controls {
      display: none !important;
    }

    .masthead {
      left: calc(4% + env(safe-area-inset-left)) !important;
      right: calc(4% + env(safe-area-inset-right)) !important;
    }

    .statusbar {
      left: calc(5% + env(safe-area-inset-left)) !important;
      right: calc(5% + env(safe-area-inset-right)) !important;
      bottom: max(2%, env(safe-area-inset-bottom)) !important;
    }

    @media (orientation: landscape) and (max-width: 1100px) and (max-height: 850px) {
      .masthead {
        top: max(2.5%, env(safe-area-inset-top)) !important;
        left: calc(18% + env(safe-area-inset-left)) !important;
        right: calc(18% + env(safe-area-inset-right)) !important;
      }

      .scene {
        top: 8% !important;
        bottom: 4.5% !important;
        left: calc(1.5% + env(safe-area-inset-left)) !important;
        right: calc(1.5% + env(safe-area-inset-right)) !important;
      }

      .board {
        right: 0 !important;
        width: 61% !important;
      }

      .teacher {
        left: 0 !important;
      }

      .statusbar {
        left: calc(5% + env(safe-area-inset-left)) !important;
        right: calc(5% + env(safe-area-inset-right)) !important;
        bottom: max(1.8%, env(safe-area-inset-bottom)) !important;
      }
    }

    @media (max-width: 700px) and (orientation: portrait) {
      .masthead {
        top: calc(env(safe-area-inset-top) + 18px) !important;
      }
    }

    @media (max-width: 430px) and (orientation: portrait) {
      .masthead {
        top: calc(env(safe-area-inset-top) + 16px) !important;
      }
    }
  </style>
'''

    index = index.replace(
        '  <meta name="theme-color" content="#050505">\n',
        '  <meta name="theme-color" content="#050505">\n' + native_head,
        1,
    )

    # Force WKWebView to request the new JS after native-layout changes.
    index = index.replace('app.js?v=72', 'app.js?v=73')
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
