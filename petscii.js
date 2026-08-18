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

  bindBitmap(document.querySelector('.title'), 'petscii-title', '#6c69ff');
  bindBitmap(document.querySelector('.subtitle'), 'petscii-subtitle', '#f2f2e8');
  bindBitmap(document.getElementById('word'), 'petscii-word', '#f2f2e8');
  bindBitmap(document.getElementById('prompt'), 'petscii-prompt', '#f2f2e8');
  bindBitmap(document.getElementById('progress'), 'petscii-progress', '#aaa9ca');

  // The original web CSS had two complete teacher images for walking frames.
  // Copy the standing image directly onto the alternate frame rule so the
  // head/face can never blink while app.js toggles frame-b.
  try {
    let standingContent = null;
    let alternateRule = null;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules; } catch (_) { continue; }
      for (const rule of Array.from(rules || [])) {
        if (rule.selectorText === '.teacher > #teacherSprite') {
          standingContent = rule.style.content;
        } else if (rule.selectorText === '.teacher > #teacherSprite.frame-b') {
          alternateRule = rule;
        }
      }
    }
    if (standingContent && alternateRule) {
      alternateRule.style.setProperty('content', standingContent, 'important');
      alternateRule.style.setProperty('transform', 'translateY(1px)', 'important');
    }
  } catch (error) {
    console.warn('Could not lock teacher walk frame.', error);
  }

  // Some browsers were not reliably delivering the board's normal button
  // click to app.js. Intercept real pointer clicks in capture phase and route
  // them through the game's already-proven Space-key control path exactly once.
  const board = document.getElementById('board');
  if (board) {
    board.addEventListener('click', event => {
      if (event.detail <= 0) return; // keyboard-generated click: let app.js handle it
      event.preventDefault();
      event.stopImmediatePropagation();
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
        bubbles: true,
        cancelable: true,
      }));
    }, true);
  }
})();
