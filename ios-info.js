(() => {
  'use strict';

  if (!document.documentElement.classList.contains('ios-native')) return;

  // Treat the native game surface as an app UI rather than a zoomable web page.
  // `manipulation` keeps normal pan/pinch behavior available but disables the
  // iOS double-tap-to-zoom gesture that can strand the game at a magnified scale.
  const touchStyle = document.createElement('style');
  touchStyle.id = 'ios-touch-behavior-style';
  touchStyle.textContent = `
    html.ios-native,
    html.ios-native body,
    html.ios-native .game,
    html.ios-native .scene,
    html.ios-native .board,
    html.ios-native .controls,
    html.ios-native button {
      touch-action: manipulation !important;
    }

    /* The teacher is shorter/wider in native landscape, so the generic pointer
       sits a little low relative to her hand. Nudge only landscape upward. */
    @media (orientation: landscape) and (max-width: 1100px) and (max-height: 850px) {
      html.ios-native .teacher .pointer {
        top: 29% !important;
      }
    }
  `;
  document.head.appendChild(touchStyle);

  // Keep the native top strip dedicated to controls. The public web build
  // still shows the Ms. Madrigral masthead, while iOS gets more room around
  // Privacy / Reshuffle / Sound and avoids overlap on narrow devices.
  const masthead = document.querySelector('.masthead');
  if (masthead) {
    masthead.setAttribute('aria-hidden', 'true');
    masthead.style.setProperty('display', 'none', 'important');
  }

  // The source controls are intentionally hidden by the native packaging
  // markup during initial paint. Restore them at runtime so the App Store
  // build exposes the same Reshuffle and Sound controls described in support
  // and store metadata without changing the public web layout.
  const controls = document.querySelector('.controls');
  if (controls) {
    controls.removeAttribute('aria-hidden');
    controls.style.setProperty('display', 'flex', 'important');
  }

  const openButton = document.getElementById('privacyButton');
  const overlay = document.getElementById('privacyOverlay');
  const closeButton = document.getElementById('privacyCloseButton');
  const board = document.getElementById('board');
  if (!openButton || !overlay || !closeButton || !board) return;

  // The game already handles taps anywhere inside its frame. Extend the same
  // behavior to the rest of the native screen so a mobile user can tap any
  // non-control area to flip/advance. Dispatch through the board's existing
  // click handler so vocabulary/audio state still has one source of truth.
  document.addEventListener('click', event => {
    if (document.documentElement.classList.contains('privacy-open')) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('#game')) return;
    if (target.closest('button, a, input, select, textarea, iframe, .native-privacy-overlay')) return;
    board.click();
  });

  // Keep Privacy easy to discover for review/accessibility, but visually quiet.
  // In portrait, reserve the left side of the safe-area top strip for Privacy
  // and force Reshuffle/Sound into a right-aligned lane so the controls can
  // never overlap each other on narrow iPhones.
  openButton.textContent = 'privacy';
  openButton.setAttribute('aria-label', 'Privacy policy');

  const privacyStyle = document.createElement('style');
  privacyStyle.id = 'ios-privacy-link-style';
  privacyStyle.textContent = `
    html.ios-native .native-privacy-button {
      position: fixed !important;
      z-index: 74 !important;
      top: max(8px, calc(env(safe-area-inset-top) + 8px)) !important;
      left: max(10px, calc(env(safe-area-inset-left) + 10px)) !important;
      width: 64px !important;
      min-width: 64px !important;
      max-width: 64px !important;
      min-height: 44px !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      color: rgba(198, 197, 221, .46) !important;
      opacity: 1 !important;
      font-size: 9px !important;
      font-weight: 500 !important;
      letter-spacing: .04em !important;
      text-transform: lowercase !important;
      text-align: left !important;
    }

    html.ios-native .controls {
      position: fixed !important;
      z-index: 73 !important;
      top: max(8px, calc(env(safe-area-inset-top) + 8px)) !important;
      left: max(92px, calc(env(safe-area-inset-left) + 92px)) !important;
      right: max(10px, calc(env(safe-area-inset-right) + 10px)) !important;
      display: flex !important;
      justify-content: flex-end !important;
      align-items: flex-start !important;
      gap: 8px !important;
    }

    html.ios-native .native-privacy-button:active,
    html.ios-native .native-privacy-button:focus-visible {
      background: transparent !important;
      color: rgba(242, 242, 232, .88) !important;
      outline: none !important;
    }

    @media (orientation: portrait) and (max-width: 430px) {
      html.ios-native .native-privacy-button {
        left: max(8px, calc(env(safe-area-inset-left) + 8px)) !important;
        width: 58px !important;
        min-width: 58px !important;
        max-width: 58px !important;
        font-size: 8px !important;
      }

      html.ios-native .controls {
        left: max(76px, calc(env(safe-area-inset-left) + 76px)) !important;
        right: max(6px, calc(env(safe-area-inset-right) + 6px)) !important;
        gap: 6px !important;
      }

      html.ios-native .controls .mini-button {
        min-height: 36px !important;
        padding-left: 6px !important;
        padding-right: 6px !important;
        font-size: 9px !important;
      }
    }
  `;
  document.head.appendChild(privacyStyle);

  let previousFocus = null;

  function openPrivacy() {
    previousFocus = document.activeElement;
    overlay.hidden = false;
    document.documentElement.classList.add('privacy-open');
    closeButton.focus({ preventScroll: true });
  }

  function closePrivacy() {
    overlay.hidden = true;
    document.documentElement.classList.remove('privacy-open');
    if (previousFocus instanceof HTMLElement) {
      previousFocus.focus({ preventScroll: true });
    } else {
      openButton.focus({ preventScroll: true });
    }
  }

  openButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openPrivacy();
  });

  closeButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    closePrivacy();
  });

  overlay.addEventListener('click', event => {
    if (event.target === overlay) closePrivacy();
  });

  document.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closePrivacy();
    }
  });
})();
