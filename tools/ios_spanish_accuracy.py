#!/usr/bin/env python3
"""Preserve correct Spanish spelling in the generated native iOS bundle.

The source CSV keeps an ASCII-friendly display column for the historical web/C64
builds. For the App Store bundle we instead display the real Spanish spelling,
including accents, dieresis, enye, and inverted punctuation, while retaining the
same original retro bitmap renderer.
"""

from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "www"
VOCAB = OUT / "vocab.csv"
PETSCII = OUT / "petscii.js"


def update_vocab() -> None:
    if not VOCAB.exists():
        raise SystemExit(f"ERROR: missing generated vocabulary: {VOCAB}")

    with VOCAB.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames
        rows = list(reader)

    if not fieldnames or "spanish" not in fieldnames or "display_es" not in fieldnames:
        raise SystemExit("ERROR: vocab.csv is missing spanish/display_es columns")

    for row in rows:
        row["display_es"] = (row.get("spanish") or "").upper()

    with VOCAB.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)

    # These representative words catch the three most important Spanish cases:
    # acute accent, enye, and accented vowel in a common word.
    text = VOCAB.read_text(encoding="utf-8")
    for expected in ("ADÍOS", "NIÑO", "PÁJARO"):
        if expected not in text:
            raise SystemExit(f"ERROR: native vocabulary is missing correct spelling: {expected}")


def update_retro_glyphs() -> None:
    if not PETSCII.exists():
        raise SystemExit(f"ERROR: missing generated retro renderer: {PETSCII}")

    text = PETSCII.read_text(encoding="utf-8")

    marker = "    '@': ['01110','10001','10111','10101','10111','10000','01111'],\n"
    spanish_glyphs = """    'Á': ['00100','01110','10001','10001','11111','10001','10001','10001'],
    'É': ['00100','11111','10000','10000','11110','10000','10000','11111'],
    'Í': ['00100','11111','00100','00100','00100','00100','00100','11111'],
    'Ó': ['00100','01110','10001','10001','10001','10001','10001','01110'],
    'Ú': ['00100','10001','10001','10001','10001','10001','10001','01110'],
    'Ü': ['01010','10001','10001','10001','10001','10001','10001','01110'],
    'Ñ': ['01010','10001','11001','10101','10011','10001','10001','10001'],
    '¡': ['00100','00000','00100','00100','00100','00100','00100'],
    '¿': ['00100','00000','00100','01000','10000','10001','01110'],
"""

    if "    'Á':" not in text:
        if marker not in text:
            raise SystemExit("ERROR: could not locate retro glyph table insertion point")
        text = text.replace(marker, spanish_glyphs + marker, 1)

    old_loop = "      for (let y = 0; y < 7; y++) {"
    new_loop = "      for (let y = 0; y < rows.length && y < 8; y++) {"
    if old_loop in text:
        text = text.replace(old_loop, new_loop, 1)
    elif new_loop not in text:
        raise SystemExit("ERROR: could not locate retro glyph rendering loop")

    for expected in ("'Á':", "'Ñ':", "'Ü':", "'¿':", "rows.length && y < 8"):
        if expected not in text:
            raise SystemExit(f"ERROR: native retro renderer is missing {expected}")

    PETSCII.write_text(text, encoding="utf-8")


def main() -> int:
    update_vocab()
    update_retro_glyphs()
    print("Spanish display verification: OK (accents, ñ, ü, inverted punctuation)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
