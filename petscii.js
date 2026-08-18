(() => {
  'use strict';

  // Actual C64 901225-01 character ROM glyph bytes for screen codes 0-63.
  // This game uses A-Z, digits, spaces, and basic punctuation from that range.
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

  // Main lesson screen.
  bindBitmap(document.querySelector('.title'), 'petscii-title', '#6c69ff');
  bindBitmap(document.querySelector('.subtitle'), 'petscii-subtitle', '#f2f2e8');
  bindBitmap(document.getElementById('word'), 'petscii-word', '#f2f2e8');
  bindBitmap(document.getElementById('prompt'), 'petscii-prompt', '#f2f2e8');
  bindBitmap(document.getElementById('progress'), 'petscii-progress', '#aaa9ca');

  // Start screen: use the exact same ROM renderer instead of the web font.
  bindBitmap(document.querySelector('.start-logo'), 'petscii-start-logo', '#6c69ff');
  bindBitmap(document.querySelector('.start-panel p'), 'petscii-start-subtitle', '#f2f2e8');
  bindBitmap(document.getElementById('startButton'), 'petscii-start-button', '#020202');
  bindBitmap(document.querySelector('.start-panel small'), 'petscii-start-small', '#aaa9ca');

  // Also make the small top controls genuine C64 bitmap text.
  bindBitmap(document.getElementById('shuffleButton'), 'petscii-mini', '#c6c5dd');
  bindBitmap(document.getElementById('muteButton'), 'petscii-mini', '#c6c5dd');

  // ------------------------------------------------------------------
  // Feet-only walking animation.
  //
  // styles.css contains two complete teacher frames. Swapping the whole
  // image made her face blink. Capture both frames once, lock the original
  // image to the standing frame, then create two clipped lower-body layers.
  // app.js can keep toggling frame-b every 115ms; only the feet/lower dress
  // now changes while the head and upper body remain completely stationary.
  // ------------------------------------------------------------------
  const teacherSprite = document.getElementById('teacherSprite');
  if (teacherSprite && teacherSprite.parentElement) {
    try {
      teacherSprite.classList.remove('frame-b');
      const standingContent = getComputedStyle(teacherSprite).content;
      teacherSprite.classList.add('frame-b');
      const walkingContent = getComputedStyle(teacherSprite).content;
      teacherSprite.classList.remove('frame-b');

      if (standingContent && standingContent !== 'none' && standingContent !== 'normal') {
        teacherSprite.style.setProperty('content', standingContent, 'important');
        teacherSprite.classList.add('upper-body-only');

        const makeFeet = (className, content) => {
          const img = document.createElement('img');
          img.alt = '';
          img.setAttribute('aria-hidden', 'true');
          img.className = `teacher-feet ${className}`;
          img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
          img.style.setProperty('content', content || standingContent, 'important');
          return img;
        };

        const feetA = makeFeet('teacher-feet-a', standingContent);
        const feetB = makeFeet('teacher-feet-b', walkingContent || standingContent);
        const pointer = teacherSprite.parentElement.querySelector('.pointer');
        teacherSprite.parentElement.insertBefore(feetA, pointer || null);
        teacherSprite.parentElement.insertBefore(feetB, pointer || null);
      }
    } catch (error) {
      console.warn('Could not build feet-only walk frames.', error);
    }
  }

  // ------------------------------------------------------------------
  // Reliable chalkboard input.
  //
  // The normal button click has been inconsistent in Chrome on this page.
  // Handle the physical pointer release in capture phase and route it to the
  // game's already-working outer-screen click path. Then swallow the browser's
  // follow-up click so a single tap cannot advance twice. Keyboard-generated
  // button clicks are left alone for accessibility.
  // ------------------------------------------------------------------
  const board = document.getElementById('board');
  const game = document.getElementById('game');
  let lastBoardPointerAdvance = -Infinity;

  if (board && game) {
    board.addEventListener('pointerup', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      lastBoardPointerAdvance = performance.now();

      game.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        detail: 1,
      }));
    }, true);

    board.addEventListener('click', event => {
      if (performance.now() - lastBoardPointerAdvance < 700) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      // Otherwise this is likely a keyboard-generated click; app.js handles it.
    }, true);
  }
})();
