(() => {
  'use strict';

  // Original 5x7 retro glyphs drawn into 8x8 character cells. This keeps the
  // chunky home-computer look without embedding a third-party character ROM.
  const GLYPHS = {
    ' ': ['00000','00000','00000','00000','00000','00000','00000'],
    'A': ['01110','10001','10001','11111','10001','10001','10001'],
    'B': ['11110','10001','10001','11110','10001','10001','11110'],
    'C': ['01111','10000','10000','10000','10000','10000','01111'],
    'D': ['11110','10001','10001','10001','10001','10001','11110'],
    'E': ['11111','10000','10000','11110','10000','10000','11111'],
    'F': ['11111','10000','10000','11110','10000','10000','10000'],
    'G': ['01111','10000','10000','10111','10001','10001','01111'],
    'H': ['10001','10001','10001','11111','10001','10001','10001'],
    'I': ['11111','00100','00100','00100','00100','00100','11111'],
    'J': ['00111','00010','00010','00010','10010','10010','01100'],
    'K': ['10001','10010','10100','11000','10100','10010','10001'],
    'L': ['10000','10000','10000','10000','10000','10000','11111'],
    'M': ['10001','11011','10101','10101','10001','10001','10001'],
    'N': ['10001','11001','10101','10011','10001','10001','10001'],
    'O': ['01110','10001','10001','10001','10001','10001','01110'],
    'P': ['11110','10001','10001','11110','10000','10000','10000'],
    'Q': ['01110','10001','10001','10001','10101','10010','01101'],
    'R': ['11110','10001','10001','11110','10100','10010','10001'],
    'S': ['01111','10000','10000','01110','00001','00001','11110'],
    'T': ['11111','00100','00100','00100','00100','00100','00100'],
    'U': ['10001','10001','10001','10001','10001','10001','01110'],
    'V': ['10001','10001','10001','10001','10001','01010','00100'],
    'W': ['10001','10001','10001','10101','10101','10101','01010'],
    'X': ['10001','10001','01010','00100','01010','10001','10001'],
    'Y': ['10001','10001','01010','00100','00100','00100','00100'],
    'Z': ['11111','00001','00010','00100','01000','10000','11111'],
    '0': ['01110','10001','10011','10101','11001','10001','01110'],
    '1': ['00100','01100','00100','00100','00100','00100','01110'],
    '2': ['01110','10001','00001','00010','00100','01000','11111'],
    '3': ['11110','00001','00001','01110','00001','00001','11110'],
    '4': ['00010','00110','01010','10010','11111','00010','00010'],
    '5': ['11111','10000','10000','11110','00001','00001','11110'],
    '6': ['01110','10000','10000','11110','10001','10001','01110'],
    '7': ['11111','00001','00010','00100','01000','01000','01000'],
    '8': ['01110','10001','10001','01110','10001','10001','01110'],
    '9': ['01110','10001','10001','01111','00001','00001','01110'],
    '.': ['00000','00000','00000','00000','00000','00110','00110'],
    ',': ['00000','00000','00000','00000','00110','00110','00100'],
    ':': ['00000','00110','00110','00000','00110','00110','00000'],
    ';': ['00000','00110','00110','00000','00110','00110','00100'],
    '!': ['00100','00100','00100','00100','00100','00000','00100'],
    '?': ['01110','10001','00001','00010','00100','00000','00100'],
    '-': ['00000','00000','00000','11111','00000','00000','00000'],
    '+': ['00000','00100','00100','11111','00100','00100','00000'],
    '=': ['00000','11111','00000','11111','00000','00000','00000'],
    '/': ['00001','00010','00010','00100','01000','01000','10000'],
    '*': ['00000','10101','01110','11111','01110','10101','00000'],
    '"': ['01010','01010','01010','00000','00000','00000','00000'],
    "'": ['00100','00100','01000','00000','00000','00000','00000'],
    '(': ['00010','00100','01000','01000','01000','00100','00010'],
    ')': ['01000','00100','00010','00010','00010','00100','01000'],
    '@': ['01110','10001','10111','10101','10111','10000','01111'],
  };
  window.MADRIGRAL_RETRO_GLYPHS = GLYPHS;

  function glyphFor(ch) {
    return GLYPHS[String(ch || ' ').toUpperCase()] || GLYPHS['?'];
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
      const rows = glyphFor(clean[i]);
      for (let y = 0; y < 7; y++) {
        const row = rows[y];
        for (let x = 0; x < 5; x++) {
          if (row[x] === '1') ctx.fillRect(i * 8 + x + 1, y, 1, 1);
        }
      }
    }
    return canvas;
  }

  function makeAccessibleText(text) {
    const span = document.createElement('span');
    span.className = 'petscii-accessible-text';
    span.textContent = text;
    return span;
  }

  function bindBitmap(el, className, color) {
    if (!el) return;
    let observer;

    const render = text => {
      const accessibleValue = String(text || '').replace(/\s+/g, ' ').trim();
      const visualValue = accessibleValue.toUpperCase();
      observer?.disconnect();
      el.textContent = '';
      el.dataset.petsciiText = accessibleValue;
      if (accessibleValue) {
        el.appendChild(makeBitmap(visualValue, className, color));
        el.appendChild(makeAccessibleText(accessibleValue));
      }
      observer?.observe(el, { childList: true, subtree: true, characterData: true });
    };

    observer = new MutationObserver(() => {
      const canvas = el.querySelector(':scope > canvas.petscii-bitmap');
      const accessible = el.querySelector(':scope > .petscii-accessible-text');
      if (canvas && accessible && el.childNodes.length === 2) return;
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

  // Original-teacher leg animation.
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
          console.warn('Original alternate teacher frame unavailable.');
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
            console.warn('Original teacher walk frames could not be loaded.');
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
        console.warn('Could not prepare original teacher leg animation.', error);
      }
    });
  }

  // Reliable chalkboard input: use the physical green-board rectangle,
  // regardless of which DOM element reports as the event target.
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