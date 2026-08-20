(() => {
  'use strict';

  // Native iOS only: when the app returns from the background or regains
  // focus, replay Ms. Madrigral's walk-in without resetting the current card.
  if (!document.documentElement.classList.contains('ios-native')) return;

  const teacher = document.getElementById('teacher');
  const teacherSprite = document.getElementById('teacherSprite');
  const startOverlay = document.getElementById('startOverlay');
  if (!teacher || !teacherSprite || !startOverlay) return;

  let wasHidden = document.hidden;
  let wasBlurred = false;
  let lastReplayAt = 0;
  let frameTimer = null;
  let finishTimer = null;

  function classHasStarted() {
    return startOverlay.classList.contains('hidden');
  }

  function finishWalk() {
    if (frameTimer) clearInterval(frameTimer);
    frameTimer = null;
    finishTimer = null;
    teacherSprite.classList.remove('frame-b');
    teacher.classList.remove('walking');
    teacher.classList.add('arrived');
  }

  function replayWalkIn() {
    if (!classHasStarted() || document.hidden) return;

    const now = Date.now();
    // iOS can fire visibility + focus back-to-back for one resume.
    if (now - lastReplayAt < 900) return;
    lastReplayAt = now;

    if (frameTimer) clearInterval(frameTimer);
    if (finishTimer) clearTimeout(finishTimer);
    frameTimer = null;
    finishTimer = null;

    teacher.classList.remove('walking', 'arrived');
    teacherSprite.classList.remove('frame-b');

    // Force a style pass so adding .walking always restarts the CSS animation.
    void teacher.offsetWidth;
    teacher.classList.add('walking');

    let frameB = false;
    frameTimer = setInterval(() => {
      frameB = !frameB;
      teacherSprite.classList.toggle('frame-b', frameB);
    }, 115);

    finishTimer = setTimeout(finishWalk, 1400);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      wasHidden = true;
      return;
    }
    if (wasHidden) {
      wasHidden = false;
      replayWalkIn();
    }
  });

  window.addEventListener('blur', () => {
    wasBlurred = true;
  });

  window.addEventListener('focus', () => {
    if (!wasBlurred) return;
    wasBlurred = false;
    replayWalkIn();
  });

  window.addEventListener('pageshow', event => {
    if (event.persisted) replayWalkIn();
  });
})();
