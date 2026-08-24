#!/usr/bin/env python3
"""Fail the iOS release bundle if executable code gains remote network endpoints."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "www"
EXECUTABLES = [
    OUT / "app.js",
    OUT / "ios-boot.js",
    OUT / "ios-focus.js",
    OUT / "ios-info.js",
]

REMOTE_URL = re.compile(r"(?:https?|wss?)://", re.IGNORECASE)
FETCH_LITERAL = re.compile(r"\bfetch\s*\(\s*([`'\"])(.*?)\1", re.DOTALL)
REMOTE_API = re.compile(r"\b(?:XMLHttpRequest|WebSocket|EventSource)\b")


def main() -> int:
    missing = [str(path) for path in EXECUTABLES if not path.exists()]
    if missing:
        raise SystemExit("ERROR: missing generated native files: " + ", ".join(missing))

    for path in EXECUTABLES:
        text = path.read_text(encoding="utf-8")
        if REMOTE_URL.search(text):
            raise SystemExit(f"ERROR: remote URL found in native executable code: {path.name}")
        if REMOTE_API.search(text):
            raise SystemExit(f"ERROR: remote networking API found in native executable code: {path.name}")

        for match in FETCH_LITERAL.finditer(text):
            target = match.group(2).strip()
            # Local packaged resources such as vocab.csv and audio/... are allowed.
            if target.startswith(("http://", "https://", "ws://", "wss://", "//")):
                raise SystemExit(
                    f"ERROR: remote fetch target found in {path.name}: {target[:120]}"
                )

    config = (ROOT / "capacitor.config.ts").read_text(encoding="utf-8")
    if re.search(r"\bserver\s*:\s*\{", config):
        raise SystemExit("ERROR: Capacitor server configuration found; native app must use bundled www assets")

    print("Native offline/privacy audit: OK (no remote executable endpoints; bundled webDir only)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
