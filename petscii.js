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
  // V61 original-teacher leg animation.
  // Read the two original CSS sprite frames directly from styles.css. Keep
  // the complete standing teacher visible underneath, then repaint a larger
  // lower-body window with frame A / frame B on a fixed CSS cadence while
  // she is walking. Head, hair, torso, arm and pointer never change.
  // ------------------------------------------------------------------
  function contentUrl(value) {
    if (!value || value === 'none' || value === 'normal') return null;
    const match = String(value).match(/^url\((['"]?)(.*)\1\)$/);
    return match ? match[2] : null;
  }

  function ruleContent(selector) {
    function scan(rules) {
      for (const rule of Array.from(rules || [])) {
        if (rule.selectorText === selector) return rule.style?.content || null;
        if (rule.cssRules) {
          const nested = scan(rule.cssRules);
          if (nested) return nested;
        }
      }
      return null;
    }

    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const found = scan(sheet.cssRules);
        if (found) return found;
      } catch (_) {}
    }
    return null;
  }

  function waitForImage(img) {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve(true);
    return new Promise(resolve => {
      img.addEventListener('load', () => resolve(true), { once: true });
      img.addEventListener('error', () => resolve(false), { once: true });
    });
  }

  const teacher = document.getElementById('teacher');
  const teacherSprite = document.getElementById('teacherSprite');

  if (teacher && teacherSprite) {
    requestAnimationFrame(() => {
      try {
        const standingContent = ruleContent('.teacher > #teacherSprite');
        const walkingContent = ruleContent('.teacher > #teacherSprite.frame-b');
        const standingUrl = contentUrl(standingContent);
        const walkingUrl = contentUrl(walkingContent);

        if (!standingContent || !standingUrl) return;

        // Keep the original complete teacher permanently on frame A.
        const lock = document.createElement('style');
        lock.id = 'stable-teacher-frame-lock';
        lock.textContent = `
          .teacher > #teacherSprite,
          .teacher > #teacherSprite.frame-b {
            content: ${standingContent} !important;
            opacity: 1 !important;
            visibility: visible !important;
            clip-path: none !important;
            z-index: 1;
          }
        `;
        document.head.appendChild(lock);

        if (!walkingUrl || walkingUrl === standingUrl) {
          console.warn('V61: original alternate teacher frame unavailable.');
          return;
        }

        const frameA = document.createElement('img');
        const frameB = document.createElement('img');
        frameA.alt = '';
        frameB.alt = '';
        frameA.setAttribute('aria-hidden', 'true');
        frameB.setAttribute('aria-hidden', 'true');
        frameA.src = standingUrl;
        frameB.src = walkingUrl;

        Promise.all([waitForImage(frameA), waitForImage(frameB)]).then(([aReady, bReady]) => {
          if (!aReady || !bReady) {
            console.warn('V61: original teacher walk frames could not be loaded.');
            return;
          }

          teacher.querySelectorAll('.teacher-leg-viewport').forEach(el => el.remove());
          document.getElementById('teacher-leg-animation-style')?.remove();

          const viewport = document.createElement('div');
          viewport.className = 'teacher-leg-viewport';
          viewport.setAttribute('aria-hidden', 'true');
          frameA.className = 'teacher-leg-source teacher-leg-a';
          frameB.className = 'teacher-leg-source teacher-leg-b';
          viewport.append(frameA, frameB);
          teacher.insertBefore(viewport, teacher.querySelector('.pointer') || null);

          const style = document.createElement('style');
          style.id = 'teacher-leg-animation-style';
          style.textContent = `
            .teacher > .teacher-leg-viewport {
              position: absolute;
              left: 0;
              bottom: 0;
              width: 76%;
              aspect-ratio: 4 / 3;
              overflow: hidden;
              background: #050505;
              z-index: 2;
              pointer-events: none;
            }
            .teacher > .teacher-leg-viewport > .teacher-leg-source {
              position: absolute;
              left: 0;
              bottom: 0;
              width: 100%;
              height: auto;
              max-width: none;
              image-rendering: pixelated;
              image-rendering: crisp-edges;
              pointer-events: none;
            }
            .teacher > .teacher-leg-viewport > .teacher-leg-a { opacity: 1; }
            .teacher > .teacher-leg-viewport > .teacher-leg-b { opacity: 0; }

            .teacher.walking > .teacher-leg-viewport > .teacher-leg-a {
              animation: v61-leg-a .34s steps(1, end) infinite;
            }
            .teacher.walking > .teacher-leg-viewport > .teacher-leg-b {
              animation: v61-leg-b .34s steps(1, end) infinite;
            }

            @keyframes v61-leg-a {
              0%, 49.99% { opacity: 1; }
              50%, 100% { opacity: 0; }
            }
            @keyframes v61-leg-b {
              0%, 49.99% { opacity: 0; }
              50%, 100% { opacity: 1; }
            }

            .teacher .pointer { z-index: 3; }
          `;
          document.head.appendChild(style);
        });
      } catch (error) {
        console.warn('V61: could not prepare original teacher leg animation.', error);
      }
    });
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
