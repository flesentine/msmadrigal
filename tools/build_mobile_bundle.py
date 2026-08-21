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
    "ios-focus.js",
    "ios-boot.js",
    "vocab.csv",
    "privacy.html",
    "support.html",
]


def make_ios_bundle_self_contained() -> None:
    """Apply native-only changes directly to the generated iOS bundle.

    Keep the public website untouched. For iOS, hide the subtitle/controls with
    inline styles, add safe-area layout rules, and stage an old-school C64 boot
    and disk-loading sequence before the existing start screen appears.
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
  <meta name="ios-native-build" content="79">
  <style id="ios-native-packaged-layout">
    html.ios-native .subtitle,
    html.ios-native .controls { display: none !important; }

    /* Native startup nostalgia: approximate a real C64 BASIC screen and disk
       load before revealing the existing Ms. Madrigral start panel. */
    html.ios-native #c64BootOverlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      padding:
        max(28px, env(safe-area-inset-top))
        max(28px, env(safe-area-inset-right))
        max(28px, env(safe-area-inset-bottom))
        max(28px, env(safe-area-inset-left));
      background: #7167c6;
      opacity: 1;
      transition: opacity 280ms steps(4, end);
      touch-action: manipulation;
    }

    html.ios-native #c64BootOverlay.c64-boot-done {
      opacity: 0;
      pointer-events: none;
    }

    html.ios-native .c64-boot-screen {
      position: relative;
      flex: 1 1 auto;
      overflow: hidden;
      background: #352879;
      color: #a6a0ff;
      padding: clamp(22px, 5vw, 54px);
      font-family: ui-monospace, Menlo, Monaco, "Courier New", monospace;
      font-size: clamp(14px, 2.2vw, 25px);
      font-weight: 700;
      line-height: 1.12;
      letter-spacing: .02em;
      text-transform: uppercase;
      text-shadow: 1px 0 rgba(255,255,255,.08);
      box-shadow: inset 0 0 46px rgba(0,0,0,.12);
    }

    html.ios-native #c64BootOutput {
      display: inline;
      margin: 0;
      white-space: pre-wrap;
      font: inherit;
      color: inherit;
    }

    html.ios-native #c64BootCursor {
      display: inline-block;
      width: .68em;
      height: 1em;
      margin-left: .08em;
      vertical-align: -.13em;
      background: currentColor;
      animation: c64-boot-blink 560ms steps(1, end) infinite;
    }

    html.ios-native #c64BootCursor.c64-boot-cursor-off {
      visibility: hidden;
    }

    @keyframes c64-boot-blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }

    @media (orientation: portrait) and (max-width: 700px) {
      html.ios-native #c64BootOverlay {
        padding:
          max(44px, env(safe-area-inset-top))
          max(18px, env(safe-area-inset-right))
          max(30px, env(safe-area-inset-bottom))
          max(18px, env(safe-area-inset-left));
      }
      html.ios-native .c64-boot-screen {
        padding: 26px 20px;
        font-size: clamp(13px, 4vw, 19px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      html.ios-native #c64BootOverlay { transition-duration: 80ms; }
      html.ios-native #c64BootCursor { animation: none; }
    }

    html.ios-native .masthead {
      left: max(24px, env(safe-area-inset-left)) !important;
      right: max(24px, env(safe-area-inset-right)) !important;
    }

    html.ios-native .statusbar {
      left: max(28px, env(safe-area-inset-left)) !important;
      right: max(28px, env(safe-area-inset-right)) !important;
      bottom: max(14px, env(safe-area-inset-bottom)) !important;
    }

    @media (orientation: landscape) and (max-width: 1100px) and (max-height: 850px) {
      html.ios-native .masthead {
        top: 10px !important;
        left: max(92px, env(safe-area-inset-left)) !important;
        right: max(92px, env(safe-area-inset-right)) !important;
      }

      html.ios-native .scene {
        top: 8% !important;
        bottom: 6% !important;
        left: max(64px, env(safe-area-inset-left)) !important;
        right: max(64px, env(safe-area-inset-right)) !important;
      }

      html.ios-native .board {
        top: 11% !important;
        right: 0 !important;
        width: 58% !important;
        height: 72% !important;
      }

      html.ios-native .teacher {
        left: 0 !important;
        top: 10% !important;
        width: 28% !important;
        height: 86% !important;
      }

      /* Keep the prompt and counter in separate layout columns so long mobile
         copy can never collide with the progress counter. */
      html.ios-native .statusbar {
        left: max(72px, env(safe-area-inset-left)) !important;
        right: max(72px, env(safe-area-inset-right)) !important;
        bottom: max(12px, env(safe-area-inset-bottom)) !important;
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto !important;
        align-items: center !important;
        justify-content: stretch !important;
        gap: 18px !important;
      }

      html.ios-native #prompt {
        min-width: 0 !important;
        justify-content: center !important;
      }

      html.ios-native .progress {
        position: static !important;
        justify-content: flex-end !important;
      }

      html.ios-native .game .petscii-prompt,
      html.ios-native .game .petscii-progress {
        height: 18px !important;
      }

      html.ios-native .game .petscii-prompt {
        max-width: 100% !important;
      }
    }

    @media (max-width: 700px) and (orientation: portrait) {
      html.ios-native .masthead {
        top: calc(env(safe-area-inset-top) + 18px) !important;
      }

      /* The board normally sits above the teacher stacking context. In portrait
         raise the teacher only for layering so the pointer can visibly cross
         the green frame instead of disappearing behind it. */
      html.ios-native .teacher {
        z-index: 9 !important;
      }

      html.ios-native .teacher .pointer {
        left: 53% !important;
        top: 37% !important;
        width: 82% !important;
        z-index: 10 !important;
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

    boot_markup = '''  <div id="c64BootOverlay" aria-hidden="true">
    <div class="c64-boot-screen">
      <pre id="c64BootOutput"></pre><span id="c64BootCursor"></span>
    </div>
  </div>
'''
    index = index.replace('<body>\n', '<body>\n' + boot_markup, 1)

    # Native-only boot and focus/resume behavior. These load after the normal
    # game scripts so neither feature changes the game's vocabulary state.
    index = index.replace(
        '</body>',
        '  <script src="ios-boot.js?v=79"></script>\n  <script src="ios-focus.js?v=79"></script>\n</body>',
        1,
    )

    # Bust native WKWebView caches after this packaging change.
    index = index.replace('styles.css?v=72', 'styles.css?v=79')
    index = index.replace('petscii.css?v=72', 'petscii.css?v=79')
    index = index.replace('app.js?v=72', 'app.js?v=79')
    index = index.replace('petscii.js?v=72', 'petscii.js?v=79')
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
