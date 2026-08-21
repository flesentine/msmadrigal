#!/usr/bin/env python3
"""Verify native-only interaction and motion safeguards survive packaging."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "www"
APP = OUT / "app.js"
FOCUS = OUT / "ios-focus.js"
INFO = OUT / "ios-info.js"
INDEX = OUT / "index.html"


def require(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise SystemExit(f"ERROR: native UI audit missing {label}: {needle}")


def main() -> int:
    for path in (APP, FOCUS, INFO, INDEX):
        if not path.exists():
            raise SystemExit(f"ERROR: missing generated native file: {path}")

    app = APP.read_text(encoding="utf-8")
    focus = FOCUS.read_text(encoding="utf-8")
    info = INFO.read_text(encoding="utf-8")
    index = INDEX.read_text(encoding="utf-8")

    require(app, "controls.style.setProperty('display', 'flex', 'important')", "iOS control restoration")
    require(app, "controls.removeAttribute('aria-hidden')", "iOS control accessibility")
    require(app, "prefers-reduced-motion: reduce", "launch Reduce Motion preference")
    require(app, "reducedMotionQuery.matches", "launch motion bypass")
    require(focus, "prefers-reduced-motion: reduce", "resume Reduce Motion preference")
    require(focus, "reducedMotionQuery.matches", "resume motion bypass")
    require(info, "masthead.style.setProperty('display', 'none', 'important')", "native masthead removal")
    require(index, 'id="shuffleButton"', "Reshuffle control")
    require(index, 'id="muteButton"', "Sound control")
    require(index, 'aria-pressed="false"', "Sound accessibility state")

    print("Native UI audit: OK (masthead hidden; controls restored; Reduce Motion honored)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
