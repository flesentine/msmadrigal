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
    """Apply native-only packaging changes to the iOS web bundle.

    The public website stays untouched. The generated www/ copy is explicitly
    marked as ios-native so safe-area CSS and the simplified iOS controls are
    guaranteed to apply even before/without Capacitor's JS bridge detection.
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

    # Do this in the generated native bundle only. This guarantees that rules
    # such as html.ios-native .controls { display:none } and safe-area offsets
    # work on every iPhone, including Dynamic Island devices.
    index = index.replace(
        '<html lang="en">',
        '<html lang="en" class="ios-native">',
        1,
    )

    native_meta = (
        '  <meta name="format-detection" content="telephone=no">\n'
        '  <meta name="color-scheme" content="dark">\n'
    )
    index = index.replace(
        '  <meta name="theme-color" content="#050505">\n',
        '  <meta name="theme-color" content="#050505">\n' + native_meta,
    )
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
