(() => {
  'use strict';

  if (!document.documentElement.classList.contains('ios-native')) return;

  const overlay = document.getElementById('c64BootOverlay');
  const canvas = document.getElementById('c64BootCanvas');
  if (!overlay || !canvas) return;

  // Same real C64 901225-01 character-ROM bytes used by the game PETSCII text.
  const ROM_B64 = 'PGZubmBiPAAYPGZ+ZmZmAHxmZnxmZnwAPGZgYGBmPAB4bGZmZmx4AH5gYHhgYH4AfmBgeGBgYAA8ZmBuZmY8AGZmZn5mZmYAPBgYGBgYPAAeDAwMDGw4AGZseHB4bGYAYGBgYGBgfgBjd39rY2NjAGZ2fn5uZmYAPGZmZmZmPAB8ZmZ8YGBgADxmZmZmPA4AfGZmfHhsZgA8ZmA8BmY8AH4YGBgYGBgAZmZmZmZmPABmZmZmZjwYAGNjY2t/d2MAZmY8GDxmZgBmZmY8GBgYAH4GDBgwYH4APDAwMDAwPAAMEjB8MGL8ADwMDAwMDDwAABg8fhgYGBgAEDB/fzAQAAAAAAAAAAAAGBgYGAAAGABmZmYAAAAAAGZm/2b/ZmYAGD5gPAZ8GABiZgwYMGZGADxmPDhnZj8ABgwYAAAAAAAMGDAwMBgMADAYDAwMGDAAAGY8/zxmAAAAGBh+GBgAAAAAAAAAGBgwAAAAfgAAAAAAAAAAABgYAAADBgwYMGAAPGZudmZmPAAYGDgYGBh+ADxmBgwwYH4APGYGHAZmPAAGDh5mfwYGAH5gfAYGZjwAPGZgfGZmPAB+ZgwYGBgYADxmZjxmZjwAPGZmPgZmPAAAABgAABgAAAAAGAAAGBgwDhgwYDAYDgAAAH4AfgAAAHAYDAYMGHAAPGYGDBgAGAA=';
  const ROM = Uint8Array.from(atob(ROM_B64), ch => ch.charCodeAt(0));

  const COLS = 40;
  const ROWS = 25;
  const CELL = 8;
  const SCREEN_W = COLS * CELL;
  const SCREEN_H = ROWS * CELL;
  const BG = '#352879';
  const FG = '#a6a0ff';

  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  const cells = Array.from({ length: ROWS }, () => Array(COLS).fill(' '));
  let cursorRow = 0;
  let cursorCol = 0;
  let cursorVisible = true;
  let finished = false;
  const timers = [];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function screenCode(ch) {
    const c = String(ch || ' ').toUpperCase().charCodeAt(0);
    if (c >= 65 && c <= 90) return c - 64;
    if (c >= 32 && c <= 63) return c;
    return 32;
  }

  function drawGlyph(ch, col, row) {
    const code = screenCode(ch);
    const base = code * 8;
    for (let y = 0; y < 8; y++) {
      const bits = ROM[base + y] || 0;
      for (let x = 0; x < 8; x++) {
        if (bits & (0x80 >> x)) ctx.fillRect(col * 8 + x, row * 8 + y, 1, 1);
      }
    }
  }

  function render() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.fillStyle = FG;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const ch = cells[row][col];
        if (ch !== ' ') drawGlyph(ch, col, row);
      }
    }
    if (!finished && cursorVisible && cursorRow >= 0 && cursorRow < ROWS) {
      ctx.fillRect(cursorCol * CELL, cursorRow * CELL, CELL, CELL);
    }
  }

  function centerColumn(text) {
    return Math.max(0, Math.floor((COLS - String(text).length) / 2));
  }

  function put(row, col, text, moveCursor = true) {
    const value = String(text).toUpperCase();
    for (let i = 0; i < value.length && col + i < COLS; i++) {
      cells[row][col + i] = value[i];
    }
    if (moveCursor) {
      cursorRow = row;
      cursorCol = Math.min(COLS - 1, col + value.length);
    }
    render();
  }

  function centered(row, text) {
    put(row, centerColumn(text), text, false);
  }

  function schedule(delay, fn) {
    timers.push(window.setTimeout(fn, delay));
  }

  function typeAt(row, col, text, startDelay, interval) {
    const value = String(text).toUpperCase();
    for (let i = 0; i < value.length; i++) {
      schedule(startDelay + i * interval, () => put(row, col + i, value[i]));
    }
  }

  function finish() {
    if (finished) return;
    finished = true;
    cursorVisible = false;
    render();
    overlay.classList.add('c64-boot-done');
    window.setTimeout(() => overlay.remove(), reduceMotion ? 80 : 320);
  }

  render();

  if (reduceMotion) {
    centered(1, '**** COMMODORE 64 BASIC V2 ****');
    centered(3, '64K RAM SYSTEM  38911 BASIC BYTES FREE');
    put(5, 0, 'READY.');
    put(6, 0, 'LOAD"*",8,1');
    put(8, 0, 'SEARCHING FOR *');
    put(9, 0, 'LOADING');
    put(11, 0, 'READY.');
    put(12, 0, 'RUN');
    schedule(180, finish);
  } else {
    schedule(90, () => centered(1, '**** COMMODORE 64 BASIC V2 ****'));
    schedule(420, () => centered(3, '64K RAM SYSTEM  38911 BASIC BYTES FREE'));
    schedule(900, () => put(5, 0, 'READY.'));
    typeAt(6, 0, 'LOAD"*",8,1', 1260, 54);
    schedule(2170, () => put(8, 0, 'SEARCHING FOR *'));
    schedule(2700, () => put(9, 0, 'LOADING'));
    schedule(3340, () => put(11, 0, 'READY.'));
    typeAt(12, 0, 'RUN', 3600, 75);
    schedule(4100, finish);
  }

  const blinkTimer = window.setInterval(() => {
    if (finished) return;
    cursorVisible = !cursorVisible;
    render();
  }, 500);

  // A tap skips the nostalgia sequence and goes straight to the app.
  overlay.addEventListener('pointerdown', finish, { passive: true });

  window.addEventListener('pagehide', () => {
    for (const timer of timers) clearTimeout(timer);
    clearInterval(blinkTimer);
  }, { once: true });
})();
