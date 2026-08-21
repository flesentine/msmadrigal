(() => {
  'use strict';

  if (!document.documentElement.classList.contains('ios-native')) return;

  const overlay = document.getElementById('c64BootOverlay');
  const canvas = document.getElementById('c64BootCanvas');
  if (!overlay || !canvas) return;

  const GLYPHS = window.MADRIGRAL_RETRO_GLYPHS;
  if (!GLYPHS) return;

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

  function glyphFor(ch) {
    return GLYPHS[String(ch || ' ').toUpperCase()] || GLYPHS['?'];
  }

  function drawGlyph(ch, col, row) {
    const rows = glyphFor(ch);
    for (let y = 0; y < 7; y++) {
      const bits = rows[y];
      for (let x = 0; x < 5; x++) {
        if (bits[x] === '1') ctx.fillRect(col * CELL + x + 1, row * CELL + y, 1, 1);
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
    centered(1, '**** MADRIGRAL BASIC V2 ****');
    centered(3, '64K RAM SYSTEM  38911 BASIC BYTES FREE');
    put(5, 0, 'READY.');
    put(6, 0, 'LOAD"MSMAD",8,1');
    put(8, 0, 'SEARCHING FOR MSMAD');
    put(9, 0, 'LOADING');
    put(11, 0, 'READY.');
    put(12, 0, 'RUN');
    schedule(180, finish);
  } else {
    schedule(90, () => centered(1, '**** MADRIGRAL BASIC V2 ****'));
    schedule(420, () => centered(3, '64K RAM SYSTEM  38911 BASIC BYTES FREE'));
    schedule(900, () => put(5, 0, 'READY.'));
    typeAt(6, 0, 'LOAD"MSMAD",8,1', 1260, 54);
    schedule(2170, () => put(8, 0, 'SEARCHING FOR MSMAD'));
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