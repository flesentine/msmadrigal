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
    inline styles, add safe-area layout rules, and stage an original retro
    8-bit boot/loading sequence before the existing start screen appears.
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
    index = index.replace(
        '<div id="startHint" class="start-hint">C64 VOICE - TAP / SPACE</div>',
        '<div id="startHint" class="start-hint">RETRO VOICE - TAP / SPACE</div>',
        1,
    )

    native_head = '''  <meta name="format-detection" content="telephone=no">
  <meta name="color-scheme" content="dark">
  <meta name="ios-native-build" content="81">
  <style id="ios-native-packaged-layout">
    html.ios-native .subtitle,
    html.ios-native .controls { display: none !important; }

    /* Native startup nostalgia: original retro glyphs drawn to a 320x200
       canvas. The outer border, scanlines, bloom and edge falloff keep the
       same CRT feel as the rest of the game. */
    html.ios-native #c64BootOverlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: grid;
      place-items: center;
      padding:
        max(24px, env(safe-area-inset-top))
        max(24px, env(safe-area-inset-right))
        max(24px, env(safe-area-inset-bottom))
        max(24px, env(safe-area-inset-left));
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
      width: min(100%, 960px);
      aspect-ratio: 8 / 5;
      max-height: calc(100dvh - max(48px, env(safe-area-inset-top) + env(safe-area-inset-bottom)));
      overflow: hidden;
      background: #352879;
      border-radius: 12px / 9px;
      box-shadow:
        0 0 0 clamp(14px, 3vw, 34px) #7167c6,
        0 16px 70px rgba(0,0,0,.28),
        inset 0 0 46px rgba(0,0,0,.16);
    }

    html.ios-native #c64BootCanvas {
      display: block;
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      filter:
        saturate(1.05)
        contrast(1.04)
        brightness(1.02)
        blur(.16px)
        drop-shadow(.4px 0 rgba(255,55,40,.10))
        drop-shadow(-.4px 0 rgba(55,90,255,.09));
    }

    /* CRT scanlines / faint RGB mask. */
    html.ios-native .c64-boot-screen::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
      opacity: .92;
      background:
        repeating-linear-gradient(
          to bottom,
          rgba(0,0,0,.20) 0,
          rgba(0,0,0,.20) 1px,
          rgba(255,255,255,.018) 1px,
          rgba(255,255,255,.018) 2px,
          transparent 2px,
          transparent 3px
        ),
        repeating-linear-gradient(
          to right,
          rgba(255,50,50,.028) 0,
          rgba(255,50,50,.028) 1px,
          rgba(65,255,95,.020) 1px,
          rgba(65,255,95,.020) 2px,
          rgba(70,90,255,.028) 2px,
          rgba(70,90,255,.028) 3px
        );
      animation: c64-boot-crt-flicker 7s steps(1, end) infinite;
    }

    /* Curved glass highlight and edge falloff. */
    html.ios-native .c64-boot-screen::after {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 3;
      pointer-events: none;
      border-radius: inherit;
      background:
        radial-gradient(ellipse at 48% 42%, transparent 0 55%, rgba(0,0,0,.07) 73%, rgba(0,0,0,.29) 100%),
        linear-gradient(118deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.01) 18%, transparent 34% 100%);
      box-shadow:
        inset 0 0 14px rgba(255,255,255,.03),
        inset 0 0 70px rgba(0,0,0,.27);
    }

    @keyframes c64-boot-crt-flicker {
      0%, 16%, 35%, 64%, 100% { opacity: .92; }
      17% { opacity: .905; }
      36% { opacity: .928; }
      65% { opacity: .912; }
    }

    @media (orientation: portrait) and (max-width: 700px) {
      html.ios-native #c64BootOverlay {
        padding:
          max(52px, env(safe-area-inset-top))
          max(22px, env(safe-area-inset-right))
          max(34px, env(safe-area-inset-bottom))
          max(22px, env(safe-area-inset-left));
      }
      html.ios-native .c64-boot-screen {
        width: 100%;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      html.ios-native #c64BootOverlay { transition-duration: 80ms; }
      html.ios-native .c64-boot-screen::before { animation: none; }
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
      <canvas id="c64BootCanvas" width="320" height="200"></canvas>
    </div>
  </div>
'''
    index = index.replace('<body>\n', '<body>\n' + boot_markup, 1)

    # Native-only boot and focus/resume behavior. These load after the normal
    # game scripts so neither feature changes the game's vocabulary state.
    index = index.replace(
        '</body>',
        '  <script src="ios-boot.js?v=81"></script>\n  <script src="ios-focus.js?v=81"></script>\n</body>',
        1,
    )

    # Bust native WKWebView caches after this packaging change.
    index = index.replace('styles.css?v=72', 'styles.css?v=81')
    index = index.replace('petscii.css?v=72', 'petscii.css?v=81')
    index = index.replace('app.js?v=72', 'app.js?v=81')
    index = index.replace('petscii.js?v=72', 'petscii.js?v=81')
    index_path.write_text(index, encoding="utf-8")

    # Remove third-party computer branding from native user-facing copy while
    # keeping the public historical web version untouched.
    app_path = OUT / "app.js"
    app = app_path.read_text(encoding="utf-8")
    app = app.replace('C64 VOICE READY -', 'RETRO VOICE READY -')
    app_path.write_text(app, encoding="utf-8")


def main() -> int:
    espeak = shutil.which("espeak-ng")
    if not espeak:
        print("ERROR: espeak-ng is required to build the bundled retro voice audio.", file=sys.stderr)
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
