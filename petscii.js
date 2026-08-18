(() => {
  'use strict';

  // Actual C64 901225-01 character ROM glyph bytes for screen codes 0-63.
  const ROM_B64 = 'PGZubmBiPAAYPGZ+ZmZmAHxmZnxmZnwAPGZgYGBmPAB4bGZmZmx4AH5gYHhgYH4AfmBgeGBgYAA8ZmBuZmY8AGZmZn5mZmYAPBgYGBgYPAAeDAwMDGw4AGZseHB4bGYAYGBgYGBgfgBjd39rY2NjAGZ2fn5uZmYAPGZmZmZmPAB8ZmZ8YGBgADxmZmZmPA4AfGZmfHhsZgA8ZmA8BmY8AH4YGBgYGBgAZmZmZmZmPABmZmZmZjwYAGNjY2t/d2MAZmY8GDxmZgBmZmY8GBgYAH4GDBgwYH4APDAwMDAwPAAMEjB8MGL8ADwMDAwMDDwAABg8fhgYGBgAEDB/fzAQAAAAAAAAAAAAGBgYGAAAGABmZmYAAAAAAGZm/2b/ZmYAGD5gPAZ8GABiZgwYMGZGADxmPDhnZj8ABgwYAAAAAAAMGDAwMBgMADAYDAwMGDAAAGY8/zxmAAAAGBh+GBgAAAAAAAAAGBgwAAAAfgAAAAAAAAAAABgYAAADBgwYMGAAPGZudmZmPAAYGDgYGBh+ADxmBgwwYH4APGYGHAZmPAAGDh5mfwYGAH5gfAYGZjwAPGZgfGZmPAB+ZgwYGBgYADxmZjxmZjwAPGZmPgZmPAAAABgAABgAAAAAGAAAGBgwDhgwYDAYDgAAAH4AfgAAAHAYDAYMGHAAPGYGDBgAGAA=';
  const ROM = Uint8Array.from(atob(ROM_B64), c => c.charCodeAt(0));

  function screenCode(ch) {
    const c = ch.toUpperCase().charCodeAt(0);
    if (c >= 65 && c <= 90) return c - 64;
    if (c >= 32 && c <= 63) return c;
    return 32;
  }

  function makeBitmap(text, className, color) {
    const clean = String(text || '').toUpperCase();
    const canvas = document.createElement('canvas');
    canvas.className = `petscii-bitmap ${className}`;
    canvas.width = Math.max(8, clean.length * 8);
    canvas.height = 8;
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;

    for (let i = 0; i < clean.length; i++) {
      const code = screenCode(clean[i]);
      const base = code * 8;
      for (let y = 0; y < 8; y++) {
        const row = ROM[base + y] || 0;
        for (let x = 0; x < 8; x++) {
          if (row & (0x80 >> x)) ctx.fillRect(i * 8 + x, y, 1, 1);
        }
      }
    }
    return canvas;
  }

  function bindBitmap(el, className, color) {
    if (!el) return;
    let observer;
    const render = text => {
      const value = String(text || '').replace(/\s+/g, ' ').trim().toUpperCase();
      observer?.disconnect();
      el.textContent = '';
      el.dataset.petsciiText = value;
      if (value) el.appendChild(makeBitmap(value, className, color));
      observer?.observe(el, { childList: true, subtree: true, characterData: true });
    };
    observer = new MutationObserver(() => {
      const canvas = el.querySelector(':scope > canvas.petscii-bitmap');
      if (canvas && el.childNodes.length === 1) return;
      render(el.textContent || el.dataset.petsciiText || '');
    });
    render(el.textContent);
  }

  bindBitmap(document.querySelector('.title'), 'petscii-title', '#6c69ff');
  bindBitmap(document.querySelector('.subtitle'), 'petscii-subtitle', '#f2f2e8');
  bindBitmap(document.getElementById('word'), 'petscii-word', '#f2f2e8');
  bindBitmap(document.getElementById('prompt'), 'petscii-prompt', '#f2f2e8');
  bindBitmap(document.getElementById('progress'), 'petscii-progress', '#aaa9ca');
  bindBitmap(document.getElementById('startLogo'), 'petscii-start-logo', '#6c69ff');
  bindBitmap(document.getElementById('startSubtitle'), 'petscii-start-subtitle', '#f2f2e8');
  bindBitmap(document.getElementById('startButton'), 'petscii-start-button', '#020202');
  bindBitmap(document.getElementById('startHint'), 'petscii-start-small', '#aaa9ca');
  bindBitmap(document.getElementById('shuffleButton'), 'petscii-mini', '#c6c5dd');
  bindBitmap(document.getElementById('muteButton'), 'petscii-mini', '#c6c5dd');

  // ------------------------------------------------------------------
  // Safe walking animation.
  // The FULL standing teacher always remains visible. We never clip, hide,
  // or replace it. The alternate walk frame is drawn only over the lower
  // portion, with a black backing that cleanly replaces frame A's feet.
  // If this overlay ever fails to load, the standing teacher still remains
  // completely intact.
  // ------------------------------------------------------------------
  function contentUrl(value) {
    if (!value || value === 'none' || value === 'normal') return null;
    const match = String(value).match(/^url\((['"]?)(.*)\1\)$/);
    return match ? match[2] : null;
  }

  const teacherSprite = document.getElementById('teacherSprite');
  if (teacherSprite && teacherSprite.parentElement) {
    try {
      teacherSprite.classList.remove('frame-b');
      const standingUrl = contentUrl(getComputedStyle(teacherSprite).content);
      teacherSprite.classList.add('frame-b');
      const walkingUrl = contentUrl(getComputedStyle(teacherSprite).content);
      teacherSprite.classList.remove('frame-b');

      teacherSprite.parentElement.querySelectorAll('.teacher-feet, .teacher-walk-overlay').forEach(el => el.remove());
      teacherSprite.classList.remove('upper-body-only');

      if (standingUrl) {
        teacherSprite.src = standingUrl;
        teacherSprite.style.setProperty('content', 'normal', 'important');
        teacherSprite.style.removeProperty('clip-path');
        teacherSprite.style.removeProperty('transform');
      }

      if (walkingUrl) {
        const overlay = document.createElement('img');
        overlay.alt = '';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.className = 'teacher-walk-overlay';
        overlay.src = walkingUrl;
        const pointer = teacherSprite.parentElement.querySelector('.pointer');
        teacherSprite.parentElement.insertBefore(overlay, pointer || null);
      }
    } catch (error) {
      console.warn('Could not prepare lower-body walk overlay.', error);
    }
  }

  // Reliable chalkboard input: use the physical green-board rectangle,
  // regardless of which DOM element Chrome reports as the event target.
  const board = document.getElementById('board');
  let lastBoardPointerAdvance = -Infinity;

  function pointInsideBoard(x, y) {
    if (!board) return false;
    const r = board.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  if (board) {
    document.addEventListener('pointerup', event => {
      if (!pointInsideBoard(event.clientX, event.clientY)) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      lastBoardPointerAdvance = performance.now();
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
        bubbles: true,
        cancelable: true,
      }));
    }, true);

    document.addEventListener('click', event => {
      if (performance.now() - lastBoardPointerAdvance > 800) return;
      if (!pointInsideBoard(event.clientX, event.clientY)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }
})();
