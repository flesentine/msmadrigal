(() => {
  'use strict';

  if (!document.documentElement.classList.contains('ios-native')) return;

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
