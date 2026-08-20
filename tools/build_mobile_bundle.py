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
