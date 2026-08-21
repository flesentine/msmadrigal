(() => {
  'use strict';

  if (!document.documentElement.classList.contains('ios-native')) return;

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
  if (!openButton || !overlay || !closeButton) return;

  // Keep Privacy easy to discover for review/accessibility, but visually quiet:
  // tiny low-contrast text with no visible chrome and a generous invisible
  // touch target underneath it.
  openButton.textContent = 'privacy';
  openButton.setAttribute('aria-label', 'Privacy policy');

  const privacyStyle = document.createElement('style');
  privacyStyle.id = 'ios-privacy-link-style';
  privacyStyle.textContent = `
    html.ios-native .native-privacy-button {
      min-width: 64px !important;
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
    }

    html.ios-native .native-privacy-button:active,
    html.ios-native .native-privacy-button:focus-visible {
      background: transparent !important;
      color: rgba(242, 242, 232, .88) !important;
      outline: none !important;
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
